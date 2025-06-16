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