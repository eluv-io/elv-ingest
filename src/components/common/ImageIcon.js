import React from "react";
import SVG from "react-inlinesvg";

const ImageIcon = ({icon, alternateIcon, label, useLoadingIndicator=false, className="", ...props}) => {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  className = "image-icon " + (className || "");

  const currentIcon = error ? alternateIcon : icon;
  const handleError = error ? undefined : () => setError(true);

  if(!currentIcon) { return null; }

  if(currentIcon.startsWith("<svg")) {
    return (
      <SVG alt={label} className={className} src={currentIcon} {...props} />
    );
  } else {
    className = loading && useLoadingIndicator ? "image-icon-with-loader " + className : className;

    return (
      <img
        alt={label}
        className={className}
        src={currentIcon}
        onLoad={() => setLoading(false)}
        onError={handleError}
        {...props}
      />
    );
  }
};

export const IconButton = ({icon, alternateIcon, label, title, onClick, disabled=false, hidden=false, className="", ...props}) => {
  if(hidden) { return null; }

  return (
    <button
      {...props}
      type="button"
      role="button"
      aria-label={label}
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className={`action action-icon ${className}`}
    >
      <ImageIcon
        icon={icon}
        alternateIcon={alternateIcon}
        className="action-icon__icon"
      />
    </button>
  );
};


export default ImageIcon;
