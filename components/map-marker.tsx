"use client";

import { useState } from 'react';
import { AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { type Report } from '@/types/report';
import { formatDistanceToNow } from 'date-fns';
import { Cat, Dog, Bird, HelpCircle } from 'lucide-react';

interface MapMarkerProps {
  report: Report;
}

const typeIcons = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  other: HelpCircle,
};

export function MapMarker({ report }: MapMarkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = typeIcons[report.type];

  return (
    <AdvancedMarker position={report.position} onClick={() => setIsOpen(true)}>
      <div className="relative cursor-pointer">
        <div className="p-2 bg-white rounded-full shadow-md">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {report.status === 'active' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </div>
      
      {isOpen && (
        <InfoWindow position={report.position} onCloseClick={() => setIsOpen(false)}>
          <div className="p-2 max-w-xs">
            <div className="aspect-video w-full mb-2 overflow-hidden rounded-lg">
              <img
                src={report.imageUrl}
                alt={`${report.type} in need`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <h3 className="font-medium capitalize">{report.type}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </div>
          </div>
        </InfoWindow>
      )}
    </AdvancedMarker>
  );
}