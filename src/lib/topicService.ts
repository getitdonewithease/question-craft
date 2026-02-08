import { getJson } from "@/lib/apiClient";

export type Topic = {
  id: string;
  name: string;
};

type TopicApiItem = {
  id?: string;
  name?: string;
  Id?: string;
  Name?: string;
};

type TopicApiResponse = {
  isSuccess?: boolean;
  value?: {
    topics?: TopicApiItem[];
  };
  message?: string;
};

const normalizeTopic = (topic: TopicApiItem): Topic | null => {
  const id = topic.id ?? topic.Id;
  const name = topic.name ?? topic.Name;
  if (!id || !name) return null;
  return { id, name };
};

export const topicService = {
  getAll: async () => {
    const response = await getJson<TopicApiResponse>("/api/v1/topics");
    const topics = response?.value?.topics ?? [];
    return topics
      .map(normalizeTopic)
      .filter((topic): topic is Topic => Boolean(topic));
  },
};
