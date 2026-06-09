import { Radio } from "lucide-react";

type ChannelAvatarProps = {
  src?: string;
  name: string;
};

export function ChannelAvatar({ src, name }: ChannelAvatarProps) {
  if (src) {
    return <img className="channel-avatar" src={src} alt="" />;
  }

  return (
    <div className="channel-avatar channel-avatar--fallback" aria-hidden="true">
      <Radio size={17} />
      <span>{name.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}
