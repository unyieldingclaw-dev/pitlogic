export const save = data => {
  try {
    localStorage.setItem('rfx-v5', JSON.stringify(data));
  } catch(e) {}
};

export const load = () => {
  try {
    const d = localStorage.getItem('rfx-v5');
    return d ? JSON.parse(d) : null;
  } catch(e) {
    return null;
  }
};