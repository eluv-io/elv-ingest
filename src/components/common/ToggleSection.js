import React, {useState} from "react";

export const ToggleSection = ({sectionName, showInitially=false, children, className=""}) => {
  const [show, setShow] = useState(showInitially);

  const toggleButton = (
    <button className="toggle-section-button action action-secondary" onClick={() => setShow(!show)}>
      { show ? `Hide ${sectionName}` : `Show ${sectionName}`}
    </button>
  );

  return (
    <div className={`toggle-section toggle-section-${show ? "show" : "hide"} ${className}`}>
      { toggleButton }

      { show ? <div className="toggle-section-content">{ children }</div> : null }
    </div>
  );
};
