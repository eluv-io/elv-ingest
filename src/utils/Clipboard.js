import Select from "select";

export const CopyText = (text) => {
  const element = document.createElement("textarea");
  element.style.position = "absolute";
  element.style.right = "-9999px";
  const yPosition = window.pageYOffset || document.documentElement.scrollTop;
  element.style.top = `${yPosition}px`;

  element.setAttribute("readonly", "");
  element.value = text;

  document.body.appendChild(element);

  Select(element);
  document.execCommand("copy");

  document.body.removeChild(element);
};
