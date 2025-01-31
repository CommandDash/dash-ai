<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import appInsights from "$lib/utils/appInsights";
  import CarbonSearch from "~icons/carbon/search";
  import CarbonAdd from "~icons/carbon/add";
  import CarbonGithub from "~icons/carbon/logo-github";
  import type { Agent } from "$lib/types/Agent";
  import { goto } from "$app/navigation";
  import { debounce } from "$lib/utils/debounce";
  import { apiRequest } from "$lib/utils/authenticate";
  import CreateAgentDialog from "$lib/components/CreateAgentDialog.svelte";
  import PrivateAgentDialog from "$lib/components/PrivateAgentDialog.svelte";

  const SEARCH_DEBOUNCE_DELAY = 400;
  let agents: Agent[] = [];
  let ownedAgents: Agent[] = [];
  let sharedAgents: Agent[] = [];
  let filteredAgents: Agent[] = [];
  let spotlightAgents: Agent[] = [];
  let searchValue: string = "";
  let showModal: boolean = false;
  let showPrivateModal: boolean = false;
  let openAccordions: Record<string, boolean> = {};
  let accessToken: string | null = "";
  let sections: { [key: string]: Agent[] } = {};

  const promotedAgent: Agent = {
    name: "promoted-agent",
    metadata: {
      display_name: "Mellowtel",
      description: "Transparent monetization engine for Flutter Apps",
      avatar_id: "mellowtel.png",
    },
    author: {
      name: "Mellowtel",
      source_url:
        "https://mellowtel.dev/flutter?utm_source=web&utm_medium=promotedcard&utm_campaign=commanddash",
    },
  };

  $: loading = true;

  onMount(async () => {
    loading = true;

    const checkAccessToken = () => localStorage.getItem("accessToken");

    const callApis = async () => {
      accessToken = checkAccessToken();

      const headers = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      try {
        const _response = await apiRequest(
          "https://api.commanddash.dev/agent/web/get-agent-list-v2",
          {
            headers: headers,
            method: "POST",
            body: JSON.stringify({ cli_version: "0.0.1" }),
          }
        );

        const _agents = await _response.json();

        if (!_response.ok) {
          throw new Error("Failed to fetch agents");
        }

        agents = _agents.public_agents.agents ?? [];
        ownedAgents = _agents.owned_agents.agents ?? [];
        sharedAgents = _agents.shared_agents.agents ?? [];
        spotlightAgents = _agents.spotlight_agents.agents ?? [];

        // Combine agents from new API into sections
        if (ownedAgents?.length > 0) {
          sections[_agents.owned_agents.title] = ownedAgents;
        }

        if (sharedAgents?.length > 0) {
          sections[_agents.shared_agents.title] = sharedAgents;
        }

        sections[_agents.spotlight_agents.title] = spotlightAgents;
        // Add existing agents under "All Agents" section
        sections[_agents.public_agents.title] = agents;

        appInsights.trackEvent({ name: "AgentsLoaded" }); // Track custom event

        // Check if the 'create' query parameter is set to 'true'
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("create") === "true") {
          showModal = true;
        }

        // Perform initial search if there is a value in the search input
        if (searchValue) {
          search(searchValue);
        }
      } catch (error) {
        appInsights.trackException({ error });
      } finally {
        loading = false;
      }
    };

    const interval = setInterval(() => {
      if (window.location.origin === "https://app.commanddash.io") {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");
        if (accessToken && refreshToken) {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          clearInterval(interval);

          callApis();
        }
      }
    }, 1000);

    callApis();
  });

  const navigateAgents = (agent: Agent) => {
    goto(`/agent/${agent.name}`);
    appInsights.trackEvent({
      name: "NavigateAgent",
      properties: { agentName: agent.name },
    }); // Track custom event
  };

  const search = debounce(async (value: string) => {
  searchValue = value;
  filteredAgents = [];

  // Combine agents from all sections to filter
  debugger;
  const allAgents = [
    ...ownedAgents,
    ...sharedAgents,
    ...spotlightAgents,
    ...agents
  ];

  filteredAgents = allAgents.filter((agent) => {
    return (
      agent.metadata.display_name.toLowerCase().includes(searchValue.toLocaleLowerCase()) ||
      agent.author?.name?.toLowerCase().includes(searchValue.toLocaleLowerCase()) ||
      agent.author?.source_url?.toLowerCase().includes(searchValue.toLocaleLowerCase())
    );
  });

  appInsights.trackEvent({ name: "Search", properties: { searchValue } }); // Track custom event
}, SEARCH_DEBOUNCE_DELAY);


  const formatGithubUrl = (url: string) => {
    const urlObj = new URL(url);
    const paths = urlObj.pathname.split("/").filter(Boolean);
    const [author, repo] = paths.slice(-2);
    return { author, repo };
  };

  const formatText = (url: string, maxLength: number) => {
    const { author, repo } = formatGithubUrl(url);
    const formattedText = `${author}/${repo}`;
    return formattedText.length > maxLength
      ? formattedText.slice(0, maxLength) + "..."
      : formattedText;
  };

  const toggleAccordion = (title: string) => {
    openAccordions = {
      ...openAccordions,
      [title]: !openAccordions[title]
    }
  };
</script>

<svelte:head>
  <title>CommandDash - Marketplace</title>
  <meta property="og:title" content="CommandDash - Explore Agents" />
  <meta property="og:type" content="link" />
  <meta
    property="og:description"
    content="Browse CommandDash Explore Agents made by the community."
  />
  <meta property="og:url" content={$page.url.href} />
</svelte:head>

<div
  class="scrollbar-custom mr-1 h-screen overflow-y-auto py-12 max-sm:pt-8 md:py-24"
>
  <div class="pt-42 mx-auto flex flex-col px-5 xl:w-[60rem] 2xl:w-[64rem]">
    <div class="flex flex-row">
      <div>
        <div class="flex items-center">
          <h1 class="text-2xl font-bold">AI Agents for Libraries</h1>
        </div>
        <h3 class="text-gray-500">
          Personalized answers from expert agents at your command
        </h3>
      </div>
      <button
        class="flex ml-auto h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-gray-300 bg-gradient-to-r from-gray-700 via-gray-900 to-black text-white py-1 px-3 shadow-lg hover:bg-gradient-to-r hover:from-gray-600 hover:via-gray-800 hover:to-black hover:shadow-md dark:border-gray-700 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-900 dark:to-black dark:hover:from-gray-700 dark:hover:via-gray-800 dark:hover:to-black transition duration-200 ease-in-out transform hover:-translate-y-1"
        on:click={() => {
          showModal = true;
        }}
      >
        <CarbonAdd />Create Agent
      </button>
    </div>
    <div class="mt-6 flex flex-wrap gap-2 items-center">
      <div
        class="relative flex h-[50px] min-w-full items-center rounded-full border px-2 has-[:focus]:border-gray-400 sm:w-64 dark:border-gray-600"
      >
        <CarbonSearch
          height="1.5em"
          width="1.5em"
          class="pointer-events-none absolute left-2 text-xs text-gray-400"
        />
        <input
          class="h-[50px] w-full bg-transparent pl-7 focus:outline-none"
          placeholder="Search any library or SDK"
          maxlength="150"
          type="search"
          bind:value={searchValue}
          on:input={(e) => search(e.currentTarget.value)}
        />
      </div>
    </div>
    {#if loading}
      <div class="flex-col w-full h-48 px-2 py-3">
        <div class="inline-flex flex-row items-end px-2">
          <span id="workspace-loader-text">Loading results</span>
          <div class="typing-loader mx-2"></div>
        </div>
      </div>
    {:else if searchValue}
      <div class="mt-7">
        <h2 class="text-xl font-semibold">Search Results</h2>
        <div
          class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
          {#each filteredAgents as agent}
            <button
              class="relative flex flex-col items-center justify-center overflow-hidden text-balance rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner max-sm:px-4 sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40"
              on:click={() => navigateAgents(agent)}
            >
              <img
                src={agent.metadata.avatar_id}
                alt="Avatar"
                class="mb-2 aspect-square size-12 flex-none rounded-full object-cover sm:mb-6 sm:size-20"
              />
              <h3
                class="mb-2 line-clamp-2 max-w-full break-words text-center text-[.8rem] font-semibold leading-snug sm:text-sm"
              >
                {agent.metadata.display_name}
              </h3>
              <p
                class="line-clamp-4 text-xs text-gray-700 sm:line-clamp-2 dark:text-gray-400"
              >
                {agent.metadata.description}
              </p>
              {#if agent.author?.source_url}
                <a
                  href={agent.author.source_url}
                  class="mt-auto pt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 hover:underline inline-flex flex-row items-center"
                  target="_blank"
                  rel="noreferrer"
                >
                  <CarbonGithub class="mx-1" />
                  {formatText(agent.author.source_url, 20)}
                </a>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {:else}
      {#each Object.keys(sections) as section, index}
        <div class="mt-7">
          <h2 class="text-xl font-semibold">{section}</h2>
          <!-- <button
            on:click={() => toggleAccordion(section)}
            class="flex items-center justify-between w-full p-5 font-medium text-gray-500 gap-3"
            aria-expanded={openAccordions[section]}
            aria-controls="accordion-collapse-body-{index}"
          >
            
            <svg
              class="w-3 h-3 {openAccordions[section]
                ? 'rotate-180'
                : ''} shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 10 6"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5L5 1 1 5"
              />
            </svg>
          </button> -->
          <div
            class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          >
            {#each sections[section] as agent}
              <button
                class="relative flex flex-col items-center justify-center overflow-hidden text-balance rounded-xl border bg-gray-50/50 px-4 py-6 text-center shadow hover:bg-gray-50 hover:shadow-inner max-sm:px-4 sm:h-64 sm:pb-4 xl:pt-8 dark:border-gray-800/70 dark:bg-gray-950/20 dark:hover:bg-gray-950/40"
                class:hidden={openAccordions[section]}
                on:click={() => navigateAgents(agent)}
              >
                <img
                  src={agent.metadata.avatar_id}
                  alt="Avatar"
                  class="mb-2 aspect-square size-12 flex-none rounded-full object-cover sm:mb-6 sm:size-20"
                />
                <h3
                  class="mb-2 line-clamp-2 max-w-full break-words text-center text-[.8rem] font-semibold leading-snug sm:text-sm"
                >
                  {agent.metadata.display_name}
                </h3>
                <p
                  class="line-clamp-4 text-xs text-gray-700 sm:line-clamp-2 dark:text-gray-400"
                >
                  {agent.metadata.description}
                </p>
                {#if agent.author?.source_url}
                  <a
                    href={agent.author.source_url}
                    class="mt-auto pt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 hover:underline inline-flex flex-row items-center"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <CarbonGithub class="mx-1" />
                    {formatText(agent.author.source_url, 20)}
                  </a>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
<CreateAgentDialog
  bind:showModal
  onClose={() => {
    showModal = false;
  }}
  onPrivateAgent={() => {
    showModal = false;
    showPrivateModal = true;
  }}
/>
<PrivateAgentDialog
  bind:showPrivateModal
  onClose={() => {
    showPrivateModal = false;
  }}
/>

<style>
  .typing-loader {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    animation: loading 1s linear infinite alternate;
    margin-bottom: 4px;
  }

  @keyframes loading {
    0% {
      background-color: #0e70c0;
      box-shadow:
        8px 0px 0px 0px #d4d4d4,
        16px 0px 0px 0px #d4d4d4;
    }

    25% {
      background-color: #d4d4d4;
      box-shadow:
        8px 0px 0px 0px #0e70c0,
        16px 0px 0px 0px #d4d4d4;
    }

    75% {
      background-color: #d4d4d4;
      box-shadow:
        8px 0px 0px 0px #d4d4d4,
        16px 0px 0px 0px #0e70c0;
    }
  }

  .promoted-card {
    border: 2px solid #1e90ff; /* Blue border */
    background-color: #e6f7ff; /* Light blue background */
  }

  .promoted-indicator {
    position: absolute;
    top: 0;
    right: 0;
    background-color: #1e90ff; /* Blue background */
    color: #fff; /* White text */
    padding: 0.2em 0.5em;
    font-size: 0.75em;
    font-weight: bold;
    border-bottom-left-radius: 0.5em;
  }

  .promoted-text {
    color: #003366; /* Dark blue text */
    text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.1); /* Subtle text shadow */
  }
</style>
