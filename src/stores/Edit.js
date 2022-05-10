import {flow, computed, makeAutoObservable, makeObservable, observable} from "mobx";
import {SafeSet, SafeTraverse} from "Utils/Misc";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";

class EditStore {
  currentLocalization = "default";
  writeTokens = {};
  versionHashes = {};

  edits = {}
  publicMetadata = {};
  originalMetadata = {};
  updatedMetadata = {};

  /*
    writeTokens = {
      "iq__33aasCButcoYPfkkgaS92rzwNCtP": "tqw__HSVndP9Pv5aZbmr9cCrD7Mm1GorsnT6ZMrZ9oxrfkfBU5hzq1ZMvow33h58GMMrxfWHfx3xnuxe6wyNuXhE"
    };

   */

  get client() {
    return this.rootStore.client;
  }

  Currencies(eventId) {
    return this.Value(eventId, "info", "payment_currencies") || ["USD"];
  }

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
  }

  LoadPublicMetadata = flow(function * ({objectId, versionHash}) {
    if(!objectId) {
      objectId = Utils.DecodeVersionHash(versionHash).objectId;
    } else if(!versionHash) {
      versionHash = yield this.client.LatestVersionHash({objectId});
    }

    this.versionHashes[objectId] = versionHash;

    if(!this.publicMetadata[objectId]) {
      this.publicMetadata[objectId] = yield this.client.ContentObjectMetadata({
        versionHash,
        metadataSubtree: "/public"
      });
    }

    return this.publicMetadata[objectId];
  });

  LoadAssetMetadata = flow(function * ({objectId, versionHash}) {
    if(this.originalMetadata[objectId]) { return; }

    if(!objectId) {
      objectId = Utils.DecodeVersionHash(versionHash).objectId;
    } else if(!versionHash) {
      versionHash = yield this.client.LatestVersionHash({objectId});
    }

    this.versionHashes[objectId] = versionHash;
    this.originalMetadata[objectId] = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "/public/asset_metadata"
    });
    this.updatedMetadata[objectId] = {
      default: this.originalMetadata[objectId]
    };
  });

  InitializeValue(objectId, path, name) {
    const currentValue = SafeTraverse((this.updatedMetadata[objectId] || {})["default"], UrlJoin(path || "", name || ""));

    if(typeof currentValue !== "undefined") {
      return;
    }

    this.SetValue(objectId, path, name, SafeTraverse((this.originalMetadata[objectId] || {}), UrlJoin(path || "", name || "")));
  }

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
    )
  }

  AppendListValue(objectId, path, value, options={}) {
    let list = this.Value(objectId, path, "", options);
    if(!list) {
      this.SetValue(objectId, path, "", [], options);
      list = [];
    }

    const index = list.length.toString();

    this.SetValue(objectId, path, index, value, options);

    return index;
  }

  SwapListValue(objectId, path, i1, i2, options={}) {
    let list = this.Value(objectId, path, "", options);

    if(!list) { return; }

    const item1 = list[i1];
    this.SetValue(objectId, path, i1, list[i2], options);
    this.SetValue(objectId, path, i2, item1, options);
  }

  RemoveValue(objectId, path, name, options) {
    path = (typeof path === "undefined" ? "" : path).toString();
    name = (typeof name === "undefined" ? "" : name).toString();

    const root = this.Value(objectId, path, undefined, options) || {};

    if(Array.isArray(root)) {
      // Remove item at array index
      this.SetValue(
        objectId,
        path,
        undefined,
        root.filter((_, index) => index.toString() !== name.toString()),
        options
      );
    } else if(typeof root === "object") {
      // Remove object key

      const newRoot = { ...root };
      delete newRoot[name];

      this.SetValue(
        objectId,
        path,
        undefined,
        newRoot,
        options
      );
    }
  }

  async BaseUrl({objectId}) {
    const libraryId = await this.client.ContentObjectLibraryId({objectId});
    return await this.client.FabricUrl({
      libraryId,
      objectId,
      writeToken: this.writeTokens[objectId]
    })
  }

  WriteToken = flow (function * ({objectId}) {
    if(!this.writeTokens[objectId]) {
      const { writeToken } = yield this.client.EditContentObject({
        libraryId: yield this.client.ContentObjectLibraryId({objectId}),
        objectId
      });

      this.writeTokens[objectId] = writeToken;
    }

    return this.writeTokens[objectId];
  });

  SetLocalization(code) {
    this.currentLocalization = code;
  }
}

export default EditStore;
