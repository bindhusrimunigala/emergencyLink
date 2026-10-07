import { useState, useEffect } from 'react';

const useGeolocation = (watch = false) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    const onSuccess = (pos) => {
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
      });
      setLoading(false);
    };

    const onError = (err) => {
      setError(err.message);
      setLoading(false);
    };

    let watchId;
    if (watch) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [watch]);

  return { location, error, loading };
};

export default useGeolocation;
