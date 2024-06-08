export interface APIParam {
  description: string;
  example: string;
  required?: boolean;
}

export interface APIEntrypoint {
  path: string;
  method: string;
  description: string;
  queryParams?: Record<string, APIParam>;
  postParams?: Record<string, APIParam>;
  pathParams?: Record<string, APIParam>;
}

export const apis: APIEntrypoint[] = [
  {
    path: "/assets/image",
    method: "GET",
    description: "Search for images from Unsplash",
    queryParams: {
      query: {
        description: "Search query for images",
        example: "nature",
        required: true,
      },
      page: {
        description: "Page number for results pagination",
        example: "1",
      },
      pick: {
        description: "If set with positive integer, will redirect to a random image",
        example: "1234",
      },
    },
  },
  {
    path: "/assets/video",
    method: "GET",
    description: "Search for videos for placeholders",
    queryParams: {
      query: {
        description: "Search query for videos",
        example: "sport",
        required: true,
      },
      page: {
        description: "Page number for results pagination",
        example: "1",
      },
      orientation: {
        description: "Video orientation. Can be 'landscape', 'portrait' or 'square'",
        example: "landscape",
      },
      pick: {
        description: "If set with positive integer, will redirect to a random video",
        example: "1234",
      },
    },
  },
  {
    path: "/assets/music",
    method: "GET",
    description: "Search for music",
    queryParams: {
      query: {
        description: "Search query for music",
        example: "war",
        required: true,
      },
      genre: {
        description:
          "Comma separated list of genre names. [see valid names: /assets/music/genres](/assets/music/genres)",
        example: "Rock,Pop",
      },
      page: {
        description: "Page number for results pagination",
        example: "1",
      },
      pick: {
        description: "If set with positive integer, will redirect to a random music",
        example: "1234",
      },
    },
  },
  {
    path: "/chat/kindly",
    method: "POST",
    description: "Chat with a dumb AI. It always responds positively.",
    postParams: {
      message: {
        description: "Message to send to the AI",
        example: "今天天气太差了",
        required: true,
      },
    },
  },
  {
    path: "/douban/search-movie",
    method: "GET",
    description: "Search for movies on Douban",
    queryParams: {
      query: {
        description: "Search query for movies",
        example: "Inception",
        required: true,
      },
      page: {
        description: "Page number for results pagination",
        example: "1",
      },
    },
  },
  {
    path: "/douban/movie",
    method: "GET",
    description: "Get information of a movie by ID",
    queryParams: {
      id: {
        description: "ID of the movie",
        example: "1292052",
        required: true,
      },
    },
  },
];
