import React from "react";
import { Check, XCircle, Loader2 } from "lucide-react";
import useKeyStatus from "../hooks/useKeyStatus.tsx";
import { Input } from "./ui/input.tsx";

interface ProviderInputProps {
  provider: string;
  apiKey: string;
  onChange: (newKey: string) => void;
}

export const ProviderInput: React.FC<ProviderInputProps> = ({
  provider,
  apiKey,
  onChange,
}) => {
  const status = useKeyStatus(provider, apiKey.trim());

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={`Enter ${provider} API Key`}
        value={apiKey}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {status === "valid" && (
          <Check className="text-green-500" size={24} />
        )}
        {status === "error" && (
          <XCircle className="text-red-500" size={24} />
        )}
        {status === "checking" && (
          <Loader2 className="text-yellow-500 animate-spin" size={24} />
        )}
      </div>
    </div>
  );
};
