import React, {useEffect, useState} from "react";
import ImageIcon from "../common/ImageIcon";
import {Form, Input} from "../common/Inputs";
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
    multiple: false,
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
        title: rootStore.editStore.Value(libraryId, "", "title") || files[0].name,
        encrypt: rootStore.editStore.Value(libraryId, "", "enable_drm") || false,
        description: rootStore.editStore.Value(libraryId, "", "description"),
        displayName: rootStore.editStore.Value(libraryId, "", "display_name"),
        images,
        CreateCallback: () => setLoading(false)
      });
    } finally {
      setLoading(false);
    }
  };

  const IngestForm = () => {
    const objectId = rootStore.ingestStore.libraryId;

    return (
      <Form className="ingest-form">
        <div className="form__section">
          <h2 className="form__section__header">
            About
          </h2>
          <Input
            required
            name="title"
            label="Name"
            objectId={objectId}
            path=""
          />
          <Input
            required
            name="display_name"
            label="Display Name"
            objectId={objectId}
            path=""
          />
          <Input
            name="description"
            label="Description"
            objectId={objectId}
            path=""
          />

          <h2 className="form__section__header">
            Digital Rights Management
          </h2>
          <Input
            type="checkbox"
            objectId={objectId}
            label="Use DRM copy protection during playback"
            name="enable_drm"
            path=""
            disabled={disableDrm}
          />

          <h2 className="form__section__header">
            Image
          </h2>
          {
            DragDropForm({
              inputProps: imageDropzone.getInputProps,
              rootProps: imageDropzone.getRootProps,
              isDragActive: imageDropzone.isDragActive,
              title: "Upload an image",
              files: images
            })
          }
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
        <div className="file-details">{`Streams found: ${ingestObject.upload.streams.length > 0 ? ingestObject.upload.streams.join(", ") : "None"}`}</div>
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
        <button
          className="action action-primary"
          onClick={OpenObjectLink}
        >
          Link
        </button>
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

    return (
      <React.Fragment>
        <h2 className="details-header">File Details</h2>
        <div className="file-details">
          <div>File: {files.length ? files[0].name || files[0].path : ""}</div>
          <div>Title: {rootStore.editStore.Value(rootStore.ingestStore.libraryId, "", "title")}</div>
          <div>Use DRM: {rootStore.editStore.Value(rootStore.ingestStore.libraryId, "", "enable_drm") ? "yes" : "no"}</div>
        </div>
        <h2 className="details-header">Progress</h2>
        <div className="file-details-steps progress">
          <div className="progress-step">
            <ImageIcon
              icon={SetIcon("upload")}
              className="progress-icon"
            />
            <span>Uploading file</span>
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
        <div>File selected: {files.length ? files[0].name : ""}</div>
      </React.Fragment>
    );
  };

  const FormView = () => {
    return (
      <React.Fragment>
        {
          DragDropForm({
            inputProps: getInputProps,
            rootProps: getRootProps,
            isDragActive,
            title: "Upload a video or audio file",
            files
          })
        }
        { IngestForm() }
      </React.Fragment>
    );
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
                Create New Object
              </button> :
              <button
                className="action action-primary"
                type="submit"
                disabled={!rootStore.editStore.Value(rootStore.ingestStore.libraryId, "", "title") || !files || loading}
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
