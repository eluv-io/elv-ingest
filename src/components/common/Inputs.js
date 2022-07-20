import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {editStore} from "Stores";
import {GenerateUUID} from "Utils/Misc";

const Validations = {
  NAN: (value) => isNaN(value) ? 0 : value,
  Numeric: (value) => (value || "").toString().replace(/[^0-9\.]+/g, ""),
  Number: (fixed) => (value) => Validations.NAN(fixed ? parseFloat(parseFloat(Validations.Numeric(value)).toFixed(fixed)) : parseFloat(Validations.Numeric(value))),
  Integer: (value) => Validations.NAN(parseInt(Validations.Numeric(value)))
};

export const LabelledField = observer(({name, label, hint, children, className=""}) => {
  if(hint) {
    let hintPath = hint;

    if(!hint) {
      /* eslint-disable no-console */
      console.warn("Missing hint:", hintPath);
    }
  }

  return (
    <div className={`labelled-field ${className}`}>
      <label htmlFor={name}>
        <div className="labelled-field__label-text">
          { label }
        </div>
      </label>
      { children }
    </div>
  );
});

const UpdateValue = (props, eventOrValue) => {
  try {
    const path = typeof props.path === "undefined" ? "info" : props.path;

    let value = eventOrValue;
    if(eventOrValue && eventOrValue.target) {
      switch(eventOrValue.target.type) {
        case "checkbox":
          value = eventOrValue.target.checked;
          break;
        default:
          value = eventOrValue.target.value;
      }
    }

    if(props.number || props.integer) {
      value = Validations.Numeric(value);
    }

    editStore.SetValue(props.objectId, path, props.name, value, {localize: props.localize});
  } catch(error) {
    /* eslint-disable no-console */
    console.error(`Failed to update value ${props.name}`);
    /* eslint-disable no-console */
    console.error(error);
  }
};

const FormatProps = props => {
  let filteredProps = { ...props };

  filteredProps.autoComplete = "off";
  filteredProps["data-lpignore"] = "true";

  if(props.number) {
    filteredProps.inputMode = "decimal";
  }

  if(props.integer) {
    filteredProps.inputMode = "numeric";
  }

  if(props.url) {
    filteredProps.inputMode = "url";
  }

  delete filteredProps.objectId;
  delete filteredProps.path;
  delete filteredProps.localize;
  delete filteredProps.hint;
  delete filteredProps.uuid;
  delete filteredProps.validations;
  delete filteredProps.Render;
  delete filteredProps.dependsOn;
  delete filteredProps.hideIf;
  delete filteredProps.only;
  delete filteredProps.defaultValue;

  // Types
  delete filteredProps.datetime;
  delete filteredProps.number;
  delete filteredProps.digits;
  delete filteredProps.integer;
  delete filteredProps.image;
  delete filteredProps.url;

  return filteredProps;
};

const FieldHidden = props => {
  if(editStore.currentLocalization !== "default" && !props.localize) {
    return true;
  }

  if(props.dependsOn) {
    let dependsOn = Array.isArray(props.dependsOn) ? props.dependsOn : [props.dependsOn];

    if(dependsOn.find(path => !editStore.Value(props.objectId, path, "", {localize: props.localize}))) {
      return true;
    }
  }

  if(props.hideIf) {
    let hideIf = Array.isArray(props.hideIf) ? props.hideIf : [props.hideIf];

    if(hideIf.find(path => !editStore.Value(props.objectId, path, "", {localize: props.localize}))) {
      return true;
    }
  }

  if(props.only && !props.only()) {
    return true;
  }
};

export const EditField = observer((props) => {
  const path = typeof props.path === "undefined" ? "info" : props.path;
  let value = editStore.Value(props.objectId, path, props.name, {localize: props.localize});

  value = props.datetime ? value || null : value || "";

  useEffect(() => {
    if(props.uuid && !value) {
      UpdateValue(props, GenerateUUID());
    }

    if(props.defaultValue && typeof value === "undefined") {
      UpdateValue(props, props.defaultValue);
    }
  }, []);

  if(FieldHidden(props)) {
    return null;
  }

  let field;
  if(props.Render) {
    // Render passed, render with props
    field = props.Render(
      FormatProps({
        ...props,
        id: props.name,
        key: `${props.key || "edit-field"}-${editStore.currentLocalization}`,
        value,
        checked: props.type === "checkbox" ? value : undefined,
        onChange: eventOrValue => UpdateValue(props, eventOrValue)
      })
    );
  } else {
    // Child passed - clone and inject props
    field = (
      React.cloneElement(
        props.children,
        FormatProps({
          ...props,
          id: props.name,
          key: `${props.key || "edit-field"}-${editStore.currentLocalization}`,
          children: undefined,
          value,
          checked: props.type === "checkbox" ? value : undefined,
          onChange: eventOrValue => UpdateValue(props, eventOrValue),
          onBlur: () => {
            // When user leaves the field after editing

            if(props.number) {
              // If numeric, validate number and trim to specified digits
              UpdateValue(props, Validations.Number(props.digits)(value));
            }

            if(props.integer) {
              UpdateValue(props, Validations.Integer(value));
            }
          }
        })
      )
    );
  }

  if(!props.label) {
    return field;
  }

  return (
    <LabelledField name={props.name} label={props.label} hint={props.hint} className={props.className ? `${props.className}__labelled-field` : ""} >
      { field }
    </LabelledField>
  );
});


export const Input = (props) => {
  return (
    <EditField {...props} className={`input input-${props.type || "text"} ${props.className || ""}`}>
      <input />
    </EditField>
  );
};

export const Select = (props) => {
  return (
    <EditField
      {...props}
      Render={newProps => (
        <select {...newProps}>
          { props.children }
        </select>
      )}
    />
  );
};

export const Form = (props) => {
  return (
    <form onSubmit={event => event.preventDefault()} autoComplete="off" aria-autocomplete="none" aria-roledescription="form" className="form" {...props}>
      { props.children }
    </form>
  );
};
