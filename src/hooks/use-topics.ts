import { useEffect, useState } from "react";
import { Topic, topicService } from "@/lib/topicService";

export const useTopics = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTopics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await topicService.getAll();
        if (isMounted) setTopics(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load topics");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  return { topics, isLoading, error };
};
