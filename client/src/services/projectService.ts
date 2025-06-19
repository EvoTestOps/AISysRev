import axios from 'axios';

export const fetch_projects = async () => {
    try {
        const res = await axios.get('/api/project');
        console.log('Fetching projects successful', res.data);
        return res.data;
    } catch (error) {
        console.log("Fetching projects unsuccessful", error);
        throw error;
    }
};

export const fetch_project_by_uuid = async (uuid: string) => {
    try {
        const res = await axios.get(`/api/project/${uuid}`);
        console.log('Fetching project by UUID successful', res.data);
        return res.data;
    } catch (error) {
        console.log("Fetching project by UUID unsuccessful", error);
        throw error;
    }
};

export const delete_project = async (uuid: string) => {
    try {
        const res = await axios.delete(`/api/project/${uuid}`);
        console.log('Deleting project successful', res.data);
        return res.data;
    } catch (error) {
        console.log("Deleting project unsuccessful", error);
        throw error;
    }
};