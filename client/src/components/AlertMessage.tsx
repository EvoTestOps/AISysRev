import { CircleAlert } from "lucide-react";

type AlertMessageProps = {
  message: string;
};

export const AlertMessage: React.FC<AlertMessageProps> = ({ message }) => (
  <div className="text-gray-500 pb-4 flex flex-row gap-2 items-center">
    <CircleAlert size={20} strokeWidth={3} />
    <span>{message}</span>
  </div>
);
