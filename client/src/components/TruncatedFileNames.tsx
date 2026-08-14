import React from "react";
import Tooltip from "@mui/material/Tooltip";
import { FetchedFile } from "../state/types";

type TruncatedFileNamesProps = {
  files: FetchedFile[];
  maxLength?: number;
  itemNamePlural: string;
};

export const TruncatedFileNames: React.FC<TruncatedFileNamesProps> = ({
  files,
  maxLength = 20,
  itemNamePlural,
}) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div>
      {files.map((file, idx) => {
        const displayName =
          file.filename.length > maxLength
            ? file.filename.slice(0, maxLength) + "..."
            : file.filename;

        return (
          <Tooltip key={idx} title={file.filename} enterDelay={200}>
            <p className="text-sm font-medium">
              {displayName} ({file.paper_count} {itemNamePlural})
            </p>
          </Tooltip>
        );
      })}
    </div>
  );
};
