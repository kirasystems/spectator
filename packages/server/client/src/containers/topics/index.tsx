import React from "react";

import { Topic } from "../../types";

type TopicsProps = {
  topics: Topic[];
};

const Topics = (props: TopicsProps) => {
  const { topics } = props;

  const [topic, setTopic] = React.useState<string>("");

  const handleTopicCreate = React.useCallback(() => {
    if (topic === "") return;

    fetch("/topics", {
      method: "post",
      body: JSON.stringify({topic: topic})
    }).then((response: any) => {
      if (!response.ok) {
        throw new Error(response.statusText)
      }

      console.log("Topic created:", response);
      setTopic("");
    }).catch((error: any) => {
      console.error("Topic create:", error);
    });
  }, [topic]);

  const handleTopicDelete = React.useCallback((topicId: number) => {
    fetch("/topic/" + topicId, {
      method: "delete",
    }).then((response: any) => {
      if (!response.ok) {
        throw new Error(response.statusText)
      }

      console.log("Topic deleted:", response);
    }).catch((error: any) => {
      console.error("Topic delete:", error);
    });
  }, []);

  const handleTopicChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(event.target.value);
  }, [setTopic]);

  return (
    <div className="Page">
      <div className="Page__Header">
        <h1 className="Page__Title">Topics</h1>
      </div>

      {topics.length === 0 && <p>No topics...</p>}

      <ol className="Topics">
        {topics.map((topic: Topic) => 
        <li key={topic.id} className="Topic">
          <p className="Topic__Name">{topic.topic}</p>
          <button className="Topic__Delete" onClick={() => {
            if (window.confirm('Are you sure you want to delete this topic? It will delete all the annotations of this topic in all documents.')) {
              handleTopicDelete(topic.id);
            }}}>
            Delete
          </button>
        </li>)}
      </ol>
      <div className="Topics__Footer">
        <input className="Topics__Input" onChange={handleTopicChange} value={topic} />
        <button className="Topic-Button" onClick={handleTopicCreate}>Add</button>
      </div>
    </div>
  );
};

export default Topics;