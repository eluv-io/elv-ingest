import UrlJoin from "url-join";

export const ImageExtensions = ["gif", "jpg", "jpeg", "png", "svg", "webp"];

// Convert a FileList to file info for UploadFiles
export const FileInfo = async (path, fileList) => {
  return await Promise.all(
    Array.from(fileList).map(async file => {
      const data = await new Response(file).arrayBuffer();
      const filePath = file.webkitRelativePath || file.name;
      return {
        path: UrlJoin(path, filePath).replace(/^\/+/g, ""),
        type: "file",
        size: file.size,
        mime_type: file.type,
        data
      };
    })
  );
};
