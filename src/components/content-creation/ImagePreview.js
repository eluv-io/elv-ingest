import React, {useEffect} from "react";

const ImagePreview = ({file}) => {
  useEffect(() => {
    URL.revokeObjectURL(file.preview);
  }, [file]);

  return file.preview ? (
    <div className="file-preview">
      <div key={file.name} className="thumbnail">
        <div className="image-wrapper">
          <img src={file.preview}/>
        </div>
      </div>
    </div>
  ) : null;
};

export default ImagePreview;
