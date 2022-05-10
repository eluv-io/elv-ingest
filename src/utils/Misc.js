import Utils from "@eluvio/elv-client-js/src/Utils";
import {parse as UUIDParse, v4 as UUID} from "uuid";

export const GenerateUUID = () => {
  return Utils.B58(UUIDParse(UUID()));
};

export const SafeTraverse = (object, ...keys) => {
  if(!object) { return object; }

  // Default: Passed a list of key arguments
  if(keys.length === 1 && Array.isArray(keys[0])) {
    // Passed an array of keys
    keys = keys[0];
  } else if(keys.length === 1 && typeof keys[0] === "string") {
    // Passed a slash delimited path
    keys = keys[0].split("/").filter(element => element);
  }

  let result = object;
  for(let i = 0; i < keys.length; i++){
    result = result[keys[i]];

    if(result === undefined) { return undefined; }
  }

  return result;
};

export const SafeSet = (object, value, ...keys) => {
  if(!object) { return object; }

  // Default: Passed a list of key arguments
  if(keys.length === 1 && Array.isArray(keys[0])) {
    // Passed an array of keys
    keys = keys[0];
  } else if(keys.length === 1 && typeof keys[0] === "string") {
    // Passed a slash delimited path
    keys = keys[0].split("/").filter(element => element);
  }

  keys = keys.filter(key => key);

  let pointer = object;
  keys.forEach((key, index) => {
    if(index === keys.length - 1) {
      pointer[key] = value;
    } else {
      if(
        (
          // Next key looks like an array index
          keys[index + 1] &&
          parseInt(keys[index + 1]).toString() === keys[index + 1]
        ) &&
        (
          // Value is not initialized or it is initialized as empty object
          !pointer[key] ||
          (typeof pointer[key] === "object" && Object.keys(pointer[key]).length === 0)
        )
      ) {
        // Initialize value as an array
        pointer[key] = [];
      } else if(!pointer[key]) {
        pointer[key] = {};
      }

      pointer = pointer[key];
    }
  });
};
