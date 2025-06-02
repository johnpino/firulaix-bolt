import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum number of previous messages to include for context
const MAX_CONTEXT_MESSAGES = 10;

// Webhook payload validation schema with comprehensive types
const WhatsAppMessageSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z.array(
              z.object({
                profile: z.object({
                  name: z.string(),
                }),
                wa_id: z.string(),
              })
            ).nonempty(),
            messages: z.array(
              z.object({
                from: z.string(),
                id: z.string(),
                timestamp: z.string(),
                type: z.string(),
                text: z
                  .object({
                    body: z.string(),
                  })
                  .optional(),
                image: z
                  .object({
                    mime_type: z.string(),
                    sha256: z.string(),
                    id: z.string(),
                  })
                  .optional(),
                location: z
                  .object({
                    latitude: z.number(),
                    longitude: z.number(),
                  })
                  .optional(),
                voice: z.object({}).optional(),
              })
            ).nonempty(),
          }),
        })
      ).nonempty(),
    })
  ).nonempty(),
});

// Type inference from the schema
type WhatsAppWebhook = z.infer<typeof WhatsAppMessageSchema>;

// Verify WhatsApp webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const [, incomingHex] = signature.match(/^sha256=(.+)$/) || [ , signature ];

  const secret = process.env.WHATSAPP_WEBHOOK_SECRET!;
  const expectedHex = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(incomingHex, 'hex');
  const hmacBuf = Buffer.from(expectedHex, 'hex');

  if (sigBuf.length !== hmacBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, hmacBuf);
}

// Send message back to WhatsApp
async function sendWhatsAppMessage(to: string, message: string) {
  const response = await fetch(
    `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message }
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to send WhatsApp message');
  }

  return response.json();
}

// Get media URL from WhatsApp
async function getMediaUrl(mediaId: string): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v17.0/${mediaId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get media URL');
  }

  const data = await response.json();
  return data.url;
}

// Download media from WhatsApp
async function downloadMedia(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download media');
  }

  // Upload to Supabase Storage and get public URL
  const buffer = await response.arrayBuffer();
  const uniqueId = randomBytes(8).toString('hex');
  const fileName = `${Date.now()}-${uniqueId}.jpg`;
  console.log('Uploading file:', fileName);
  
  const { data, error } = await supabase.storage
    .from('animal-images')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('animal-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

// Fetch recent conversation history
async function getConversationHistory(senderId: string) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('message, ai_response, timestamp')
    .eq('sender_id', senderId)
    .order('timestamp', { ascending: false })
    .limit(MAX_CONTEXT_MESSAGES);

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  return data
    .reverse()
    .flatMap(msg => [
      { role: 'user' as const, content: msg.message },
      { role: 'assistant' as const, content: msg.ai_response }
    ]);
}

// Create a new report in Supabase
async function createReport(
  type: string,
  description: string,
  location: { lat: number; lng: number },
  imageUrl: string
) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      type,
      description,
      lat: location.lat,
      lng: location.lng,
      image_url: imageUrl,
      status: 'active',
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    return null;
  }

  return data;
}

// OpenAI function definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_report',
      description: 'Create a new report for an animal in need',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['dog', 'cat', 'other'],
            description: 'Type of animal',
          },
          description: {
            type: 'string',
            description: 'Description of the situation',
          },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          imageUrl: {
            type: 'string',
            description: 'URL of the image',
          },
        },
        required: ['type', 'description', 'location', 'imageUrl'],
      },
    },
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN) {
    return new NextResponse(challenge);
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const signature = headers().get('x-hub-signature-256');

    if (!signature) {
      return new NextResponse('Signature required', { status: 401 });
    }

    const body = await request.text();
    console.log('Incoming webhook payload:', body);

    if (!verifySignature(body, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse and validate webhook payload using Zod's safeParse
    const parsedPayload = WhatsAppMessageSchema.safeParse(JSON.parse(body));

    if (!parsedPayload.success) {
      console.error('Invalid webhook payload:', parsedPayload.error);
      // Return 200 to prevent retries, but log the error
      return new NextResponse('OK', { status: 200 });
    }

    const payload = parsedPayload.data;
    
    // Safely access nested properties
    const firstEntry = payload.entry[0];
    const firstChange = firstEntry?.changes[0];
    const value = firstChange?.value;
    
    if (!value?.messages?.[0] || !value?.contacts?.[0]) {
      console.error('Missing required message or contact data');
      return new NextResponse('OK', { status: 200 });
    }

    const message = value.messages[0];
    const sender = value.contacts[0];

    // Extract message content and media
    let messageContent = '';
    let imageUrl: string | undefined;
    let location: { lat: number; lng: number } | undefined;

    // Handle different message types
    if (message.type === 'voice') {
      messageContent = '[VOICE_MESSAGE]';
    } else if (message.text?.body) {
      messageContent = message.text.body;
    }

    if (message.image) {
      const mediaUrl = await getMediaUrl(message.image.id);
      console.log('mediaUrl:', mediaUrl);
      imageUrl = await downloadMedia(mediaUrl);
      console.log('imageUrl:', imageUrl);
      messageContent += ` [Image uploaded: ${imageUrl}]`;
    }

    if (message.location) {
      location = {
        lat: message.location.latitude,
        lng: message.location.longitude,
      };
      messageContent += ` [Location: ${location.lat}, ${location.lng}]`;
    }

    // Get conversation history
    const conversationHistory = await getConversationHistory(sender.wa_id);
    console.log('conversationHistory:', conversationHistory);

    // Process message with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping users report animals in need. You should:
1. Collect information about the animal (type, description, location, and image)
2. Ask for missing information one question at a time
3. Once you have all required information, call the create_report function
4. Be friendly and empathetic
5. Keep responses concise and clear
6. If the user sends an image, acknowledge it
7. If the user sends a location, acknowledge it
8. If information is missing, ask for it specifically
9. Respond in the same language the user used to start the conversation
10. If you receive a [VOICE_MESSAGE], respond with a polite message in the user's language explaining that voice messages cannot be processed and requesting text, images, or location instead
11. After creating a report, provide a friendly confirmation message in the user's language, thanking them and explaining that help is on the way`
        },
        ...conversationHistory,
        {
          role: "user",
          content: messageContent
        }
      ],
      tools,
    });

    const aiResponse = completion.choices[0].message;
    let responseToUser = aiResponse.content || '';

    // Handle function calls
    if (aiResponse.tool_calls) {
      for (const toolCall of aiResponse.tool_calls) {
        if (toolCall.function.name === 'create_report') {
          const args = JSON.parse(toolCall.function.arguments);
          const report = await createReport(
            args.type,
            args.description,
            args.location,
            args.imageUrl
          );

          // Make a second OpenAI call to generate a contextual response
          const followUpCompletion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
              {
                role: "system",
                content: `You are an AI assistant helping users report animals in need. Generate a friendly response to confirm their report has been created. The response should:
1. Be in the same language as the user's original message
2. Thank them for their help
3. Confirm that their report has been received
4. Assure them that help will be coordinated
5. Keep the message concise and empathetic`
              },
              ...conversationHistory,
              {
                role: "user",
                content: messageContent
              },
              aiResponse,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                name: "create_report",
                content: report ? JSON.stringify(report) : "error"
              }
            ]
          });

          responseToUser = followUpCompletion.choices[0].message.content || '';
        }
      }
    }

    // Send response to user
    await sendWhatsAppMessage(sender.wa_id, responseToUser);

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        sender_id: sender.wa_id,
        sender_name: sender.profile.name,
        message: messageContent,
        message_type: message.type,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        ai_response: responseToUser,
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent retries
    return new NextResponse('OK', { status: 200 });
  }
}