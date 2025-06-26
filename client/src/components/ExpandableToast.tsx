import { useState } from "react";
import { toast } from "react-toastify";


type ValidationError = {
  file: string;
  row: number;
  message: string;
};

export const ExpandableToast = (parsed: ValidationError[]) => {
  let isOpen = false;

  const ToastContent = () => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpanded = () => {
      isOpen = !isOpen;
      setExpanded(!expanded);
    };

    return (
      <div onClick={toggleExpanded} className="cursor-pointer">
        {!expanded ? (
          <span><strong>Errors occurred!</strong><br /> Click to see validation errors.</span>
        ) : (
          <div className="max-h-64 overflow-y-auto text-sm">
            <strong>Validation errors:</strong>
            <ul className="mt-2 list-disc list-inside">
              {parsed.map((e, index) => (
                <li key={index}>
                  File: {e.file}, Row: {e.row}, Message: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  toast.error(<ToastContent />, {
    autoClose: 10000,
    closeOnClick: false,
  });
}