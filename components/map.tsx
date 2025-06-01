"use client";

import { useEffect, useState } from 'react';
import { APIProvider, Map as GoogleMap } from '@vis.gl/react-google-maps';
import { MapMarker } from './map-marker';
import { type Report } from '@/types/report';
import { supabase } from '@/lib/supabase';

interface Location {
  lat: number;
  lng: number;
}

export default function Map() {
  const [defaultCenter, setDefaultCenter] = useState<Location>({
    lat: 3.451647,
    lng: -76.531982
  });
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDefaultCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    async function fetchReports() {
      console.log('Fetching reports from Supabase...');
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('timestamp', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No reports found in the database');
        return;
      }

      const formattedReports: Report[] = data.map(report => ({
        id: report.id,
        position: {
          lat: report.lat,
          lng: report.lng
        },
        imageUrl: report.image_url,
        type: report.type,
        description: report.description,
        timestamp: new Date(report.timestamp).getTime(),
        status: report.status
      }));

      console.log('Formatted reports:', formattedReports);
      setReports(formattedReports);
    }

    fetchReports();
  }, []);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        defaultCenter={defaultCenter}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      >
        {reports.map((report) => (
          <MapMarker key={report.id} report={report} />
        ))}
      </GoogleMap>
    </APIProvider>
  );
}