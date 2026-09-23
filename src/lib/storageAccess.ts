import { getBlob, getStorage, ref } from 'firebase/storage';

export const openProtectedStorageFile = async (
  storagePath: string,
  fallbackFileName = 'document'
): Promise<void> => {
  if (!storagePath) {
    throw new Error('No storage path was provided.');
  }

  const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');

  try {
    const blob = await getBlob(ref(getStorage(), storagePath));
    const objectUrl = URL.createObjectURL(blob);

    if (popup) {
      popup.location.href = objectUrl;
    } else {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = fallbackFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    popup?.close();
    throw error;
  }
};
