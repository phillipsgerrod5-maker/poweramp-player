import { Cpu, Film, Zap } from "lucide-react";
import { useState } from "react";
import { CommanderPage } from "./components/CommanderPage";
import { PlayerPage } from "./components/PlayerPage";
import { StoryPage } from "./components/StoryPage";

type Tab = "player" | "commander" | "story";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("player");

  return (
    <div className="app-shell">
      <div className="app-content">
        {activeTab === "player" && <PlayerPage />}
        {activeTab === "commander" && <CommanderPage />}
        {activeTab === "story" && <StoryPage />}
      </div>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar" aria-label="Main navigation">
        <button
          type="button"
          className={`tab-btn ${activeTab === "player" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("player")}
          data-ocid="nav.player.tab"
        >
          <Zap size={22} />
          <span>PLAYER</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "commander" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("commander")}
          data-ocid="nav.commander.tab"
        >
          <Cpu size={22} />
          <span>COMMANDER</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "story" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("story")}
          data-ocid="nav.story.tab"
        >
          <Film size={22} />
          <span>STORY</span>
        </button>
      </nav>
    </div>
  );
}
