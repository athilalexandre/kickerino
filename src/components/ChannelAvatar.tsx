import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

type ChannelAvatarProps = {
  src?: string;
  name: string;
};

export function ChannelAvatar({ src, name }: ChannelAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        className="channel-avatar"
        src={src}
        alt=""
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="channel-avatar channel-avatar--fallback" aria-hidden="true">
      <Radio size={17} />
      <span>{name.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}
