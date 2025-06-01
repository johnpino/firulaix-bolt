import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Webhook payload validation schema
const WhatsAppMessageSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string(),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string(),
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string(),
          }),
          wa_id: z.string(),
        })),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          text: z.object({
            body: z.string(),
          }).optional(),
          type: z.string(),
          image: z.object({
            mime_type: z.string(),
            sha256: z.string(),
            id: z.string(),
          }).optional(),
        })),
      }),
    })),
  })),
});

// Verify WhatsApp webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const hmac = createHash('sha256')
    .update(process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');
  
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hmac)
    );
  } catch {
    return false;
  }
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

export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const signature = headers().get('x-hub-signature-256');
    if (!signature) {
      return new NextResponse('Signature required', { status: 401 });
    }

    const body = await request.text();
    if (!verifySignature(body, signature.replace('sha256=', ''))) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse and validate webhook payload
    const payload = WhatsAppMessageSchema.parse(JSON.parse(body));
    const message = payload.entry[0].changes[0].value.messages[0];
    const sender = payload.entry[0].changes[0].value.contacts[0];

    // Extract message content
    const messageContent = message.text?.body || 'Media message received';
    
    // Process message with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for a street animal rescue organization. Help users report and get information about animals in need."
        },
        {
          role: "user",
          content: messageContent
        }
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        sender_id: sender.wa_id,
        sender_name: sender.profile.name,
        message: messageContent,
        message_type: message.type,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        ai_response: aiResponse,
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Send response back to user
    await sendWhatsAppMessage(sender.wa_id, aiResponse || 'Sorry, I could not process your message.');

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}