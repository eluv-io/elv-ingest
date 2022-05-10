import React, { useEffect } from "react";

let id = 1;
let modalStack = [];
const Modal = ({children, Close, className=""}) => {
  let modalId;
  useEffect(() => {
    // Keep track of which modal is on top so we can ensure only the topmost one is closed on escape press
    modalId = id;
    modalStack.unshift(modalId);

    id += 1;

    const CloseOnEscape = (event) => {
      if(modalStack[0] !== modalId) { return; }

      if(event.key === "Escape") {
        Close();
      }
    };

    document.addEventListener("keydown", CloseOnEscape);

    return () => {
      modalStack = modalStack.filter(id => id !== modalId);
      document.removeEventListener("keydown", CloseOnEscape);
    };
  }, []);

  return (
    <div className={`modal ${className}`}>
      <div className="modal__background" onClick={Close} />
      <div className="modal__content">
        { children }
      </div>
    </div>
  );
};

export default Modal;
