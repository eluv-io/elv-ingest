import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import {computed, configure, flow, makeAutoObservable, observable} from "mobx";
import IngestStore from "Stores/Ingest";
import EditStore from "Stores/Edit";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  client = undefined;
  currentAccountAddress = undefined;
  address = undefined;
  libraryId = undefined;

  navigationBreadcrumbs = [];

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
    this.address = yield this.client.CurrentAccountAddress();
    this.networkInfo = yield this.client.NetworkInfo();
  });
}

export const rootStore = new RootStore();
export const editStore = rootStore.editStore;
export const ingestStore = rootStore.ingestStore;

window.rootStore = rootStore;
