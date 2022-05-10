import React from "react";

const EmbedPlayer = ({src}) => {
  return (
    <div className="embed">
      <iframe
        width="854"
        height="480"
        scrolling="no"
        marginHeight="0"
        marginWidth="0"
        frameBorder="0"
        type="text/html"
        src={src}
      />
    </div>
  );
};

export default EmbedPlayer;
