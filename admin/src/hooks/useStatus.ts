import { useEffect, useState } from 'react';
import { getStatus, subscribeStatus, type Status } from '../api';

export function useStatus(): Status {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  useEffect(() => {
    getStatus().then(setStatus).catch(() => { /* idle */ });
    return subscribeStatus(setStatus);
  }, []);
  return status;
}
