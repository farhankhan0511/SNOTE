import axiosInstance from "@/utils/axios";

export const forkNote = async (noteId) => {
  const { data } = await axiosInstance.post(`/note/${noteId}/fork`);
  return data.data;
};
export const togglevisibility = async (id) => {
  const { data } = await axiosInstance.patch(`/mynote/togglevisibility/${id}`);
  return data.data;
}

export const getAllNotes = async () => {
  const { data } = await axiosInstance.get("/note/notes");
  console.log(data)
  return data.data;
};
export const getAllUserNotes = async () => {
  const { data } = await axiosInstance.get("/mynote/notes");
  return data.data;
};
export const uploadNoteFile=async(formData)=>{
  const { data } = await axiosInstance.post("/mynote/uploadFile", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data.data;
};
export const getUserNoteById = async (id) => {
  const { data } = await axiosInstance.get(`/mynote/${id}`);
  return data.data;
};
export const getNoteById = async (id) => {
  const { data } = await axiosInstance.get(`/note/${id}`);
  return data.data;
};

export const createNote = async (noteData) => {
  const { data } = await axiosInstance.post("/mynote", noteData);
  return data.data;
};

export const updateNote = async ({ id, ...noteData }) => {
  const { data } = await axiosInstance.put(`/mynote/${id}`, noteData);
  return data.data;
};

export const deleteNote = async (id) => {
  const { data } = await axiosInstance.delete(`/mynote/${id}`);
  return data.message;
};

export const getAllArchivedNotes = async () => {
  const { data } = await axiosInstance.get("/mynote/archive");
  return data.data;
};

export const archiveNote = async (id) => {
  const { data } = await axiosInstance.post(`/mynote/archive/${id}`);
  return data.data;
};

export const getAllTrashedNotes = async () => {
  const { data } = await axiosInstance.get("/mynote/trash");
  return data.data;
};

export const trashNote = async (id) => {
  const { data } = await axiosInstance.post(`/mynote/trash/${id}`);
  return data.data;
};

export const restoreTrashedNote = async (id) => {
  const { data } = await axiosInstance.post(`/mynote/restore/${id}`);
  return data.data;
};

export const getPRApi=async(prId)=>{
  const { data } = await axiosInstance.get(`/prs/${prId}`);
  return data.data;
};

export const getPendingPRsApi=async()=>{
  const { data } = await axiosInstance.get(`/prs?status=open`);
  return data.data;
};

export const closePRApi=async(prId)=>{
  const { data } = await axiosInstance.post(`/prs/${prId}/close`);
  return data.data;
}

export const mergePRApi=async(prId)=>{
  const { data } = await axiosInstance.post(`/prs/${prId}/merge`);
  return data.data;
}

export const createPRApi=async(prData)=>{
  const { data } = await axiosInstance.post(`/prs`,prData);
  return data.data;
}
export const resolveMergeApi=async(prId,resolvedText)=>{
  const { data } = await axiosInstance.post(`/prs/${prId}/resolve`,{resolvedText});
  return data.data;
}