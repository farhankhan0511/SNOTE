import axiosInstance from "@/utils/axios";



export const getAllNotes = async () => {
  const { data } = await axiosInstance.get("/note/notes");
  console.log(data)
  return data.data;
};
export const getAllUserNotes = async () => {
  const { data } = await axiosInstance.get("/mynote/notes");
  return data.data;
};

export const getNoteById = async (id) => {
  const { data } = await axiosInstance.get(`/mynote/${id}`);
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

