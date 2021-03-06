import {computed, flow, makeAutoObservable, observable} from "mobx";
import UrlJoin from "url-join";
import {FileInfo} from "Utils/Files";
import {ValidateLibrary} from "@eluvio/elv-client-js/src/Validation";
import {rootStore} from "./index";
const ABR = require("@eluvio/elv-abr-profile");
const defaultOptions = require("@eluvio/elv-lro-status/defaultOptions");
const enhanceLROStatus = require("@eluvio/elv-lro-status/enhanceLROStatus");

class IngestStore {
  ingestObjectId = undefined;
  ingestObjects = {};
  ingestErrors = {
    errors: [],
    warnings: []
  };

  constructor(rootStore) {
    makeAutoObservable(this, {
      client: computed,
      ingestObjects: observable,
      ingestObject: computed
    });

    this.rootStore = rootStore;
  }

  get client() {
    return this.rootStore.client;
  }

  get libraryId() {
    return this.rootStore.libraryId;
  }

  get ingestObject() {
    return this.ingestObjects[this.ingestObjectId];
  }

  UpdateIngestObject = (data) => {
    if(!this.ingestObjects[this.ingestObjectId]) {
      this.ingestObjects[this.ingestObjectId] = {
        currentStep: "",
        upload: {},
        ingest: {},
        finalize: {}
      };
    }

    this.ingestObjects[this.ingestObjectId] = Object.assign(
      this.ingestObjects[this.ingestObjectId],
      data
    );
  }

  UpdateIngestErrors = (type, message) => {
    this.ingestErrors[type].push(message);
  }

  ResetIngestForm = () => {
    this.ingestObjectId = "";
    this.ingestErrors = {
      errors: [],
      warnings: []
    };
    rootStore.editStore.SetValue(rootStore.formObjectId, "playback_encryption");
    rootStore.editStore.SetValue(rootStore.formObjectId, "name");
    rootStore.editStore.SetValue(rootStore.formObjectId, "description");
    rootStore.editStore.SetValue(rootStore.formObjectId, "display_name");
  }

  CreateLink({targetHash, linkTarget="/meta/public/asset_metadata", options={}}) {
    if(!targetHash) {
      return {
        ...options,
        ".": {
          ...(options["."] || {}),
          "auto_update":{"tag":"latest"}
        },
        "/": UrlJoin("./", linkTarget)
      };
    } else {
      return {
        ...options,
        ".": {
          ...(options["."] || {}),
          "auto_update":{"tag":"latest"}
        },
        "/": UrlJoin("/qfab", targetHash, linkTarget)
      };
    }
  }

  GenerateEmbedUrl = flow (function * ({versionHash, objectId, auth=false}) {
    let embedUrl = new URL("https://embed.v3.contentfabric.io");
    const hasAudio = (rootStore.ingestStore.ingestObject?.upload?.streams || []).includes("audio");
    const networkName = rootStore.networkInfo.name === "demov3" ? "demo" : (rootStore.networkInfo.name === "test" && rootStore.networkInfo.id === 955205) ? "testv4" : rootStore.networkInfo.name;

    embedUrl.searchParams.set("p", "");
    embedUrl.searchParams.set("lp", "");
    embedUrl.searchParams.set("net", networkName);

    if(auth) {
      embedUrl.searchParams.set("ath", yield rootStore.GenerateStateChannelToken({objectId, versionHash}));
    }

    if(versionHash) {
      embedUrl.searchParams.set("vid", versionHash);
    } else {
      embedUrl.searchParams.set("oid", objectId);
    }

    if(hasAudio) {
      // NFT has audio, set to autohide controls, audio enabled
      embedUrl.searchParams.set("ct", "s");
    } else {
      embedUrl.searchParams.set("ct", "h");
    }

    return embedUrl.toString();
  });

  WaitForPublish = flow (function * ({hash, objectId}) {
    let publishFinished = false;
    let latestObjectHash;
    while(!publishFinished) {
      latestObjectHash = yield this.client.LatestVersionHash({
        objectId
      });

      if(latestObjectHash === hash) {
        publishFinished = true;
      } else {
        yield new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
  });

  CreateProductionMaster = flow(function * ({
    libraryId,
    files,
    title,
    playbackEncryption="both",
    description,
    displayName,
    images=[],
    CreateCallback
  }) {
    ValidateLibrary(libraryId);

    const fileInfo = yield FileInfo("", files);
    const {qid} = yield this.client.ContentLibrary({libraryId});
    const libABRMetadata = yield this.client.ContentObjectMetadata({
      libraryId: yield this.client.ContentObjectLibraryId({objectId: qid}),
      objectId: qid,
      metadataSubtree: "/abr"
    });

    let response;
    if(rootStore.objectId) {
      response = yield this.client.EditContentObject({
        libraryId,
        objectId: rootStore.objectId,
        options: libABRMetadata.mez_content_type ? { type: libABRMetadata.mez_content_type } : {}
      });
    } else {
      response = yield this.client.CreateContentObject({
        libraryId,
        options: libABRMetadata.mez_content_type ? { type: libABRMetadata.mez_content_type } : {}
      });
    }

    this.ingestObjectId = response.id;
    this.UpdateIngestObject({
      currentStep: "upload"
    });

    if(CreateCallback && typeof CreateCallback === "function") CreateCallback();

    // Create encryption conk
    yield this.client.CreateEncryptionConk({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      createKMSConk: true
    });

    // Upload files
    yield this.client.UploadFiles({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      fileInfo,
      callback: (progress) => {
        let uploadSum = 0;
        let totalSum = 0;
        Object.values(progress).forEach(fileProgress => {
          uploadSum += fileProgress.uploaded;
          totalSum += fileProgress.total;
        });

        this.UpdateIngestObject({
          upload: {
            percentage: Math.round((uploadSum / totalSum) * 100)
          }
        });
      },
      encryption: ["both", "drm"].includes(playbackEncryption) ? "cgck" : "none"
    });

    this.UpdateIngestObject({
      upload: {
        ...this.ingestObject.upload,
        complete: true,
      },
      currentStep: "ingest"
    });

    // Bitcode method
    const {errors} = yield this.client.CallBitcodeMethod({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      method: UrlJoin("media", "production_master", "init"),
      body: {
        access: []
      },
      constant: false
    });

    if(errors) {
      /* eslint-disable no-console */
      console.error(errors);
      this.UpdateIngestErrors("errors", "Error: Unable to ingest selected media file.");
    }

    // Check if audio and video streams
    const streams = (yield this.client.ContentObjectMetadata({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      metadataSubtree: UrlJoin("production_master", "variants", "default", "streams")
    }));

    this.UpdateIngestObject({
      upload: {
        ...this.ingestObject.upload,
        streams: Object.keys(streams || {})
      }
    });

    // Merge metadata
    yield this.client.MergeMetadata({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      metadata: {
        public: {
          name: `${title} [ingest: uploading] MASTER`,
          description,
          asset_metadata: {
            display_title: `${title} [ingest: uploading] MASTER`
          }
        },
        reference: true,
        elv_created_at: new Date().getTime()
      },
    });

    // Create ABR Ladder
    let {abrProfile, contentTypeId} = yield this.CreateABRLadder({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token
    });

    // Update name to remove [ingest: uploading]
    yield this.client.MergeMetadata({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      metadata: {
        public: {
          name: `${title} MASTER`,
          description,
          asset_metadata: {
            display_title: `${title} MASTER`
          }
        },
        reference: true,
        elv_created_at: new Date().getTime()
      },
    });

    // Finalize object
    const finalizeResponse = yield this.client.FinalizeContentObject({
      libraryId,
      objectId: this.ingestObjectId,
      writeToken: response.write_token,
      commitMessage: "Create master object",
      awaitCommitConfirmation: false
    });

    if(playbackEncryption !== "both") {
      let abrProfileExclude;

      if(playbackEncryption === "drm") {
        abrProfileExclude = ABR.ProfileExcludeClear(abrProfile);
      } else if(playbackEncryption === "clear") {
        abrProfileExclude = ABR.ProfileExcludeDRM(abrProfile);
      }

      if(abrProfileExclude.ok) {
        abrProfile = abrProfileExclude.result;
      } else {
        this.UpdateIngestErrors("errors", "Error: ABR Profile has no relevant playout formats.");
      }
    }

    this.CreateABRMezzanine({
      libraryId,
      objectId: finalizeResponse.id,
      masterObjectId: finalizeResponse.id,
      type: contentTypeId,
      name: title,
      description: description,
      displayName,
      masterVersionHash: finalizeResponse.hash,
      abrProfile,
      images
    });
  });

  CreateABRLadder = flow(function * ({libraryId, objectId, writeToken}) {
    try {
      const {qid} = yield this.client.ContentLibrary({libraryId});
      const libABRMetadata = yield this.client.ContentObjectMetadata({
        libraryId: yield this.client.ContentObjectLibraryId({objectId: qid}),
        objectId: qid,
        metadataSubtree: "/abr"
      });

      if(!libABRMetadata || !libABRMetadata.default_profile || !libABRMetadata.mez_content_type) {
        this.UpdateIngestErrors("errors", "Error: Library is not set up for ingesting media files.");
        return;
      }

      const {production_master} = yield this.client.ContentObjectMetadata({
        libraryId,
        objectId,
        writeToken,
        select: [
          "production_master/sources",
          "production_master/variants/default"
        ]
      });

      if(!production_master || !production_master.sources || !production_master.variants || !production_master.variants.default) {
        this.UpdateIngestErrors("errors", "Error: Unable to create ABR profile.");
        return;
      }

      const generatedProfile = ABR.ABRProfileForVariant(
        production_master.sources,
        production_master.variants.default,
        libABRMetadata.default_profile
      );

      if(!generatedProfile.ok) {
        this.UpdateIngestErrors("errors", "Error: Unable to create ABR profile.");
        return;
      }

      return {
        abrProfile: generatedProfile.result,
        contentTypeId: libABRMetadata.mez_content_type
      };
    } catch(error) {
      /* eslint-disable no-console */
      console.error(error);
      this.UpdateIngestErrors("errors", "Error: Unable to create ABR profile.");
    }
  });

  CreateABRMezzanine = flow(function * ({
    libraryId,
    masterObjectId,
    type,
    name,
    description,
    displayName,
    images=[],
    masterVersionHash,
    abrProfile,
    variant="default",
    offeringKey="default"
  }) {
    const createResponse = yield this.client.CreateABRMezzanine({
      libraryId,
      type,
      name: `${name} [ingest: transcoding] MEZ`,
      masterVersionHash,
      objectId: masterObjectId,
      abrProfile,
      variant,
      offeringKey
    });
    const objectId = createResponse.id;

    yield this.WaitForPublish({
      hash: createResponse.hash,
      libraryId,
      objectId
    });

    try {
      const { writeToken, hash } = yield this.client.StartABRMezzanineJobs({
        libraryId,
        objectId
      });

      yield this.WaitForPublish({
        hash,
        libraryId,
        objectId
      });

      let image;
      if(images.length) {
        yield this.client.UploadFiles({
          libraryId,
          objectId: createResponse.id,
          writeToken,
          fileInfo: yield FileInfo("", images),
          encryption: "none"
        });

        // Upload image and create link for metadata
        const filesMetadata = yield this.client.ContentObjectMetadata({
          libraryId,
          objectId: createResponse.id,
          writeToken,
          metadataSubtree: "/files"
        });
        const imagePath = Object.keys(filesMetadata).find(key => key !== ".");
        const network = this.rootStore.networkInfo;
        const networkUrl = `${network.configUrl.split("config")[0]}/s/${network.name}`;

        image = networkUrl + this.CreateLink({
          targetHash: hash,
          linkTarget: UrlJoin("files", imagePath)
        })["/"];
      }

      let done;
      let error;
      let statusIntervalId;

      while(!done && !error) {
        let status = yield this.client.LROStatus({
          libraryId,
          objectId
        });

        if(status === undefined) {
          /* eslint-disable no-console */
          console.error("Received no job status information from server - object already finalized?");
          return;
        }

        if(statusIntervalId) clearInterval(statusIntervalId);
        statusIntervalId = setInterval( async () => {
          const options = Object.assign(
            defaultOptions(),
            {currentTime: new Date()}
          );
          const enhancedStatus = enhanceLROStatus(options, status);

          if(!enhancedStatus.ok) {
            /* eslint-disable no-console */
            console.error("Error processing LRO status");
            this.UpdateIngestErrors("errors", "Error: Unable to transcode selected file.");
            clearInterval(statusIntervalId);
            error = true;
            return;
          }

          const {estimated_time_left_seconds, estimated_time_left_h_m_s, run_state} = enhancedStatus.result.summary;

          this.UpdateIngestObject({
            ingest: {
              runState: run_state,
              estimatedTimeLeft: !estimated_time_left_seconds ? "Calculating..." : estimated_time_left_h_m_s
            }
          });

          if(run_state !== "running") {
            clearInterval(statusIntervalId);
            done = true;

            const embedUrl = await this.GenerateEmbedUrl({
              objectId: this.ingestObjectId
            });

            await this.client.MergeMetadata({
              libraryId,
              objectId,
              writeToken,
              metadata: {
                public: {
                  name: `${name} MEZ`,
                  description,
                  asset_metadata: {
                    display_title: `${name} MEZ`,
                    nft: {
                      name,
                      display_name: displayName,
                      description,
                      created_at: new Date(),
                      playable: true,
                      has_audio: this.ingestObject.upload.streams.includes("audio"),
                      embed_url: embedUrl,
                      external_url: embedUrl,
                      image
                    }
                  }
                }
              }
            });

            this.FinalizeABRMezzanine({
              libraryId,
              objectId,
              writeToken,
              name
            });
          }
        }, 1000);

        yield new Promise(resolve => setTimeout(resolve, 15000));
      }
    } catch(error) {
      /* eslint-disable no-console */
      console.error(error);
      this.UpdateIngestErrors("errors", "Error: Unable to transcode selected file.");

      const {write_token} = yield this.client.EditContentObject({
        libraryId,
        objectId: masterObjectId
      });

      yield this.client.MergeMetadata({
        libraryId,
        objectId,
        writeToken: createResponse.write_token,
        metadata: {
          public: {
            name: `${name} [ingest: error] MASTER`,
            description: "Unable to transcode file.",
            asset_metadata: {
              display_title: `${name} [ingest: error] MASTER`
            }
          },
          reference: true,
          elv_created_at: new Date().getTime()
        },
      });

      yield this.client.FinalizeContentObject({
        libraryId,
        objectId: masterObjectId,
        writeToken: write_token,
        commitMessage: "Create master object",
        awaitCommitConfirmation: false
      });
    }
  });

  FinalizeABRMezzanine = flow(function * ({libraryId, objectId}) {
    this.UpdateIngestObject({
      currentStep: "finalize"
    });

    try {
      const finalizeAbrResponse = yield this.client.FinalizeABRMezzanine({
        libraryId,
        objectId
      });

      this.UpdateIngestObject({
        finalize: {
          mezzanineHash: finalizeAbrResponse.hash,
          objectId: finalizeAbrResponse.id
        }
      });
    } catch(error) {
      /* eslint-disable no-console */
      console.error(error);
      this.UpdateIngestErrors("errors", "Error: Unable to transcode selected file.");
    }
  });
}

export default IngestStore;
