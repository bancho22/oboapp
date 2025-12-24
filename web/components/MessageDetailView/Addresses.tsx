import React from "react";
import { trackEvent } from "@/lib/analytics";
import type { Address } from "@/lib/types";
import DetailItem from "./DetailItem";

interface AddressesProps {
  addresses?: Address[] | null;
  onAddressClick?: (lat: number, lng: number) => void;
  onClose: () => void;
  messageId?: string;
}

export default function Addresses({
  addresses,
  onAddressClick,
  onClose,
  messageId = "unknown",
}: AddressesProps) {
  if (!addresses || addresses.length === 0) return null;

  return (
    <DetailItem title="Адреси">
      <div className="space-y-2">
        {addresses.map((address, index) => (
          <button
            key={`address-${address.formattedAddress}-${index}`}
            onClick={() => {
              trackEvent({
                name: "address_clicked",
                params: {
                  message_id: messageId,
                  formatted_address: address.formattedAddress,
                },
              });
              onAddressClick?.(
                address.coordinates.lat,
                address.coordinates.lng
              );
              onClose();
            }}
            className="w-full text-left bg-gray-50 rounded-md p-3 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <p className="text-sm text-gray-900">{address.formattedAddress}</p>
            {address.coordinates && (
              <p className="text-xs text-gray-500 mt-1">
                {address.coordinates.lat.toFixed(6)},{" "}
                {address.coordinates.lng.toFixed(6)}
              </p>
            )}
          </button>
        ))}
      </div>
    </DetailItem>
  );
}
