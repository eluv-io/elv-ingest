import {flow, makeAutoObservable} from "mobx";
import {SafeSet, SafeTraverse} from "Utils/Misc";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";

class EditStore {
  currentLocalization = "default";
  versionHashes = {};

  edits = {}
  originalMetadata = {};
  updatedMetadata = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
  }

  LoadAssetMetadata = flow(function * ({objectId, versionHash, path="/public"}) {
    if(this.originalMetadata[objectId]) { return; }

    if(!objectId) {
      objectId = Utils.DecodeVersionHash(versionHash).objectId;
    } else if(!versionHash) {
      versionHash = yield this.client.LatestVersionHash({objectId});
    }

    this.versionHashes[objectId] = versionHash;
    this.originalMetadata[objectId] = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: path
    });
    this.updatedMetadata[objectId] = {
      default: this.originalMetadata[objectId]
    };
  });

  Value(objectId, path, name, options={}) {
    const localizationKey = options.localize ? this.currentLocalization : "default";

    const updatedValue = SafeTraverse((this.updatedMetadata[objectId] || {})[localizationKey], UrlJoin(path || "", name || ""));

    if(typeof updatedValue !== "undefined") {
      return updatedValue;
    }

    if(localizationKey === "default") {
      return SafeTraverse((this.originalMetadata[objectId] || {}), UrlJoin(path || "", name || ""));
    } else {
      return (
        SafeTraverse((this.originalMetadata[objectId] || {}), UrlJoin("localizations", localizationKey, path || "", name || "")) ||
        SafeTraverse((this.originalMetadata[objectId] || {}), UrlJoin(path || "", name || ""))
      );
    }
  }

  SetValue(objectId, path, name, value, options={}) {
    path = (typeof path === "undefined" ? "" : path).toString();
    name = (typeof name === "undefined" ? "" : name).toString();

    const localizationKey = options.localize ? this.currentLocalization : "default";

    SafeSet(
      this.updatedMetadata,
      value,
      [
        objectId,
        localizationKey,
        ...path.split("/").filter(element => element),
        name
      ]
    );

    SafeSet(
      this.edits,
      { objectId, path: UrlJoin(path, name), value, localization: localizationKey },
      [ objectId, this.currentLocalization, UrlJoin(path, name) ]
    );
  }
}

export default EditStore;
