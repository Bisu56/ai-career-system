import api from "./api";

const fileNameFrom = (disposition, fallbackName) => {
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return fallbackName;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const errorMessageFrom = async (error) => {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text());
      return body.error || body.message;
    } catch {
      return null;
    }
  }
  return null;
};

export async function downloadFile(url, fallbackName = "resume.pdf") {
  let res;
  try {
    res = await api.get(url, { responseType: "blob" });
  } catch (error) {
    const message = await errorMessageFrom(error);
    throw new Error(message || "The download failed. Please try again.");
  }

  const name = fileNameFrom(res.headers["content-disposition"] || "", fallbackName);
  const href = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
