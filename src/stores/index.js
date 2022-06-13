import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import {configure, flow, makeAutoObservable} from "mobx";
import IngestStore from "Stores/Ingest";
import EditStore from "Stores/Edit";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  client = undefined;
  address = undefined;
  libraryId = undefined;
  objectId = undefined;
  formObjectId = undefined;

  constructor() {
    makeAutoObservable(this);

    this.ingestStore = new IngestStore(this);
    this.editStore = new EditStore(this);
  }

  Initialize = flow(function * () {
    this.client = new FrameClient({
      target: window.parent,
      timeout: 60
    });

    let params = {};
    let queryParams = window.location.search.split("?")[1] || "";
    queryParams = queryParams.split("&");
    queryParams.forEach(param => {
      const [key, value] = param.split("=");
      params[key] = value;
    });

    if(!params.libraryId) {
      throw Error("Missing query parameter 'libraryId'");
    }

    this.libraryId = yield params.libraryId;
    this.objectId = yield params.objectId;
    this.formObjectId = this.objectId || this.libraryId;

    if(this.objectId) {
      this.editStore.LoadAssetMetadata({
        objectId: this.objectId
      });
    }

    this.address = yield this.client.CurrentAccountAddress();
    this.networkInfo = yield this.client.NetworkInfo();
  });

  GenerateStateChannelToken = flow(function * ({objectId, versionHash}) {
    return yield this.client.GenerateStateChannelToken({
      objectId,
      versionHash
    });
  });
}

export const rootStore = new RootStore();
export const editStore = rootStore.editStore;
export const ingestStore = rootStore.ingestStore;

window.rootStore = rootStore;
