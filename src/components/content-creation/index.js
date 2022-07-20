import React, {useEffect, useState} from "react";
import ImageIcon from "../common/ImageIcon";
import {Form, Input, Select} from "../common/Inputs";
import {observer} from "mobx-react";
import {useDropzone} from "react-dropzone";

import PictureIcon from "../../static/icons/image.svg";
import LoadingIcon from "../../static/icons/loading.gif";
import CheckmarkIcon from "../../static/icons/check.svg";
import EllipsisIcon from "../../static/icons/ellipsis.svg";
import ErrorIcon from "../../static/icons/circle-exclamation.svg";

import {rootStore} from "../../stores/index";
import {toJS} from "mobx";
import UrlJoin from "url-join";
import {PageLoader} from "../common/Loader";
import EmbedPlayer from "./EmbedPlayer";
import {Copyable} from "Components/common/Copyable";
import {ToggleSection} from "Components/common/ToggleSection";

const ContentCreation = observer(() => {
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [disableDrm, setDisableDrm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [embedPlayerSrc, setEmbedPlayerSrc] = useState(undefined);

  useEffect( () => {
    if(!rootStore.ingestStore.libraryId) throw Error("Unable to find library ID");

    const GetDrmCert = async () => {
      if(!rootStore.ingestStore.client) return;

      const response = await rootStore.ingestStore.client.ContentLibrary({
        libraryId: rootStore.ingestStore.libraryId
      });
      const drmCert = await rootStore.ingestStore.client.ContentObjectMetadata({
        libraryId: rootStore.ingestStore.libraryId,
        objectId: response.qid,
        metadataSubtree: UrlJoin("elv", "media", "drm", "fps", "cert")
      });

      setDisableDrm(!drmCert);
    };

    GetDrmCert();
  }, []);

  const HandleImages = (images) => {
    if(!images.length) return;
    images = images.map(file => {
      const preview = file.type.startsWith("image") ? URL.createObjectURL(file) : undefined;

      return Object.assign(file, {preview});
    });
    setImages(images);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    accept: "audio/*, video/*",
    onDrop: (files) => setFiles(files)
  });

  const imageDropzone = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: HandleImages
  });

  const HandleUpload = async () => {
    setLoading(true);
    try {
      const libraryId = rootStore.ingestStore.libraryId;

      await rootStore.ingestStore.CreateProductionMaster({
        libraryId,
        files,
        title: rootStore.editStore.Value(rootStore.formObjectId, "", "name"),
        playbackEncryption: rootStore.editStore.Value(rootStore.formObjectId, "", "playback_encryption") || "both",
        description: rootStore.editStore.Value(rootStore.formObjectId, "", "description"),
        displayName: rootStore.editStore.Value(rootStore.formObjectId, "asset_metadata", "display_name"),
        images,
        CreateCallback: () => setLoading(false)
      });
    } finally {
      setLoading(false);
    }
  };

  const IngestForm = () => {
    return (
      <Form className="ingest-form">
        {
          <div className="form__section">
            <h2 className="form__section__header">
              About
            </h2>
            <Input
              required
              name="name"
              label="Name"
              objectId={rootStore.formObjectId}
              path=""
            />
            <Input
              required
              name="display_title"
              label="Display Name"
              objectId={rootStore.formObjectId}
              path="asset_metadata"
            />
            <Input
              name="description"
              label="Description"
              objectId={rootStore.formObjectId}
              path=""
            />
          </div>
        }

        <div className="form__section">
          <h2 className="form__section__header">
            Playout Options
          </h2>
          <div className="form__section__header__description">Select a playback encryption option. Enable Clear and/or Digital Rights Management copy protection during playback.</div>

          <Select
            required
            objectId={rootStore.formObjectId}
            name="playback_encryption"
            path=""
            label="Playback encryption"
          >
            <option value="">Please select an option</option>
            <option value="drm" disabled={disableDrm}>Digital Rights Management</option>
            <option value="clear">Clear</option>
            <option value="both" disabled={disableDrm}>Both</option>
          </Select>
        </div>

        <div className="form__section">
          <h2 className="form__section__header">
            NFT Image
          </h2>
          <div className="form__section__header__description">Upload an image that will be used for your NFT. A square image is recommended.</div>
          <ToggleSection
            sectionName="Image Uploader"
            children={
              DragDropForm({
                inputProps: imageDropzone.getInputProps,
                rootProps: imageDropzone.getRootProps,
                isDragActive: imageDropzone.isDragActive,
                files: images
              })
            }
          />
        </div>
      </Form>
    );
  };

  const OpenObjectLink = () => {
    rootStore.client.SendMessage({
      options: {
        operation: "OpenLink",
        libraryId: rootStore.libraryId,
        objectId: rootStore.ingestStore.ingestObjectId
      },
      noResponse: true
    });
  };

  const SetIcon = (step) => {
    const ingestObject = toJS(rootStore.ingestStore.ingestObject);
    if(!ingestObject) return null;

    switch(step) {
      case "upload":
        return ingestObject.upload?.percentage === 100 ? CheckmarkIcon : LoadingIcon;
      case "ingest":
        if(rootStore.ingestStore.ingestErrors.errors.length) {
          return ErrorIcon;
        } else if(ingestObject.currentStep === "ingest" || ingestObject.ingest?.runState === "finished") {
          return ingestObject.ingest?.runState === "finished" ? CheckmarkIcon : LoadingIcon;
        } else {
          return EllipsisIcon;
        }
      case "finalize":
        if(ingestObject.currentStep === "finalize") {
          return ingestObject.finalize.mezzanineHash ? CheckmarkIcon : LoadingIcon;
        } else {
          return EllipsisIcon;
        }
    }
  };

  const MediaInfo = () => {
    const ingestObject = rootStore.ingestStore.ingestObject;
    if(!ingestObject.upload?.streams) return null;

    return (
      <React.Fragment>
        <div className="details-header">Media Info</div>
        <div className="detail-field">
          <label>Streams found:</label>
          <span>{ingestObject.upload.streams.length > 0 ? ingestObject.upload.streams.join(", ") : "None"}</span>
        </div>
      </React.Fragment>
    );
  };

  const IngestingErrors = () => {
    const {errors, warnings} = toJS(rootStore.ingestStore.ingestErrors);

    return (
      [...errors, ...warnings].map((message, i) => (
        <div className={`error-notification${message ? " visible" : ""}`} key={i}>{message}</div>
      ))
    );
  };

  const FabricBrowserLink = () => {
    if(!rootStore.ingestStore.ingestObjectId || !rootStore.ingestStore.ingestObject.finalize.mezzanineHash) { return null; }

    return (
      <React.Fragment>
        <h2 className="details-header">View in Fabric Browser</h2>
        <div className="detail-field">
          <label>Object ID:</label>
          <button type="button" className="inline-link" onClick={OpenObjectLink} >
            { rootStore.ingestStore.ingestObject.finalize.objectId}
          </button>
        </div>
        <div className="detail-field">
          <label>Hash:</label>
          <button type="button" className="inline-link"></button>
          <Copyable copy={rootStore.ingestStore.ingestObject.finalize.mezzanineHash}>
            <div>{rootStore.ingestStore.ingestObject.finalize.mezzanineHash}</div>
          </Copyable>
        </div>
      </React.Fragment>
    );
  };

  const GenerateEmbedPlayer = () => {
    if(!rootStore.ingestStore.ingestObject.finalize.mezzanineHash) return null;

    const GetSrc = async () => {
      const url = await rootStore.ingestStore.GenerateEmbedUrl({
        versionHash: rootStore.ingestStore.ingestObject.finalize.mezzanineHash,
        auth: true
      });

      setEmbedPlayerSrc(url);
      if(!embedPlayerSrc) return null;
    };

    GetSrc();

    return (
      <React.Fragment>
        <h2 className="details-header">Preview</h2>
        <EmbedPlayer
          src={embedPlayerSrc}
        />
      </React.Fragment>
    );
  };

  const IngestView = () => {
    let ingestObject = toJS(rootStore.ingestStore.ingestObject) || {};
    const playbackEncryption = rootStore.editStore.Value(rootStore.ingestStore.libraryId, "", "playback_encryption");

    const PlayoutOptionsText = () => {
      if(playbackEncryption === "both") {
        return "DRM, Clear";
      } else if(playbackEncryption === "drm") {
        return "DRM";
      } else {
        return "Clear";
      }
    };

    return (
      <React.Fragment>
        <h2 className="details-header">File Details</h2>
        <div className="detail-field">
          <label>{files.length === 1 ? "File:" : "Files:"}</label>
          <div className="file-names">
            {
              files.map((file, index) => (
                <div key={`${file.name || file.path}-${index}`}>{file.name || file.path}</div>
              ))
            }
          </div>
        </div>
        <div className="detail-field">
          <label>Title:</label>
          <span>{rootStore.editStore.Value(rootStore.formObjectId, "", "name")}</span>
        </div>
        <div className="detail-field">
          <label>Playout {playbackEncryption === "both" ? "options" : "option"}:</label>
          <span>{PlayoutOptionsText()}</span>
        </div>

        <h2 className="details-header">Progress</h2>
        <div className="file-details-steps progress">
          <div className="progress-step">
            <ImageIcon
              icon={SetIcon("upload")}
              className="progress-icon"
            />
            <span>{`Uploading ${files.length === 0 ? "file" : "files"}`}</span>
            <span>{ingestObject.currentStep === "upload" && `${ingestObject.upload?.percentage || 0}% Complete`}</span>
          </div>

          <div className={`progress-step${ingestObject.currentStep === "upload" ? " pending-step" : ""}`}>
            <ImageIcon
              icon={SetIcon("ingest")}
              className="progress-icon"
            />
            <span>Converting to streaming format</span>
            <span>{ingestObject.ingest?.runState === "running" && `Estimated time left: ${ingestObject.ingest?.estimatedTimeLeft || "TBD"}`}</span>
          </div>

          <div className={`progress-step${(["upload", "ingest"].includes(ingestObject.currentStep)) ? " pending-step" : ""}`}>
            <ImageIcon
              icon={SetIcon("finalize")}
              className="progress-icon"
            />
            <span>Finalizing</span>
            <span></span>
          </div>
        </div>
        { MediaInfo() }
        { IngestingErrors() }
        { FabricBrowserLink() }
        { GenerateEmbedPlayer() }
      </React.Fragment>
    );
  };

  const DragDropForm = ({inputProps, rootProps, isDragActive, title, description, files}) => {
    return (
      <React.Fragment>
        <div>{title}</div>
        <div className="description">{description}</div>
        <section className="drop-container">
          <div {...rootProps()} className={`dropzone${isDragActive ? " drag-active" : ""}`}>
            <ImageIcon
              className="icon"
              icon={PictureIcon}
            />
            <div className="upload-instructions">Drag a file or click to upload</div>
            <input {...inputProps()} />
          </div>
        </section>
        {
          files.map(file => (
            <div className="file-selected" key={file.name}>File: {file.name}</div>
          ))
        }
      </React.Fragment>
    );
  };

  const FormView = () => {
    return (
      <React.Fragment>
        <h2 className="form__section__header">
          Media
        </h2>
        <div className="form__section__header__description">Upload a video or audio file for ingestion.</div>
        {
          DragDropForm({
            inputProps: getInputProps,
            rootProps: getRootProps,
            isDragActive,
            files
          })
        }
        { IngestForm() }
      </React.Fragment>
    );
  };

  const DisableSubmit = () => {
    if(
      !rootStore.editStore.Value(rootStore.formObjectId, "", "name") ||
      !files.length ||
      loading ||
      !rootStore.editStore.Value(rootStore.formObjectId, "", "playback_encryption")
    ) {
      return true;
    }

    return false;
  };

  return (
    <div className="ingest-form">
      <div className="app-header sticky">
        <h3 className="header-text">Create Playable Media Object
        </h3>
        <div className="actions">
          {
            rootStore.ingestStore.ingestObjectId ?
              <button
                className="action action-primary"
                onClick={() => {
                  rootStore.ingestStore.ResetIngestForm();
                  setFiles([]);
                  setImages([]);
                }}
                disabled={!(rootStore.ingestStore.ingestErrors.errors.length || rootStore.ingestStore.ingestObject.finalize.mezzanineHash)}
              >
                Reset
              </button> :
              <button
                className="action action-primary"
                type="submit"
                disabled={DisableSubmit()}
                onClick={HandleUpload}
              >
                Create
              </button>
          }
        </div>
      </div>
      {
        loading ? <PageLoader /> :
          <div className="edit-page">
            {
              rootStore.ingestStore.ingestObjectId ?
                IngestView() :
                FormView()
            }
          </div>
      }
    </div>
  );
});

export default ContentCreation;
