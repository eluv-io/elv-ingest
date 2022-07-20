import React, {useState} from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {CopyText} from "Utils/Clipboard";
import ImageIcon from "Components/common/ImageIcon";
import CopyIcon from "Assets/icons/clipboard.svg";
import CheckmarkIcon from "Assets/icons/check.svg";

export const Copyable = ({copy, children, className}) => {
  const [copied, setCopied] = useState(false);

  return (
    <span className={`copyable ${className || ""}`}>
      { children }
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root open={copied}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              title="Copy to Clipboard"
              onClick={() => {
                CopyText(copy);
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                }, 3000);
              }}
            >
              <ImageIcon className="copy-icon" icon={copied ? CheckmarkIcon : CopyIcon} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="right" sideOffset={8}>
            <div className="tooltip-content">
              Copied
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </span>
  );
};
