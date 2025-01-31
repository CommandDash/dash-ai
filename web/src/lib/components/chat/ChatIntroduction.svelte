<script lang="ts">
    import IconVisualStudio from "../icons/IconVisualStudio.svelte";
    import { toastStore } from "$lib/stores/ToastStores";
    import appInsights from "$lib/utils/appInsights"; // Import the appInsights instance

    import Icon from "@iconify/svelte";
    import { ToastType } from "$lib/types/Toast";
    import type { Questionnaire } from "$lib/types/Questionnaires";
    import { questionnaireStore } from "$lib/stores/QuestionnaireStores";
    import SettingsAgent from "$lib/components/SettingsAgent.svelte";

    export let agentDisplayName: string = "";
    export let agentDescription: string = "";
    export let agentLogo: string = "";
    export let agentId: string = "";
    export let agentIsDataSourceIndexed: boolean = true;
    export let agentDataSources: Array<any> = [];

    let showModalSettings: boolean = false;

    let emailValue: string = "";
    let questionnaires: Array<Questionnaire> = [
        { id: "generate-summary", message: "Generate Summary" },
        { id: "ask-about", message: "Ask about a feature" },
        { id: "search-code", message: "Search for code or issues" },
        { id: "get-help", message: "Get help fixing an issue" },
    ];

    const notify = async () => {
        const data = {
            name: agentId,
            recipient_mail: emailValue,
            notify_for: "data_index",
        };
        try {
            const response = await fetch(
                "https://api.commanddash.dev/agent/notify",
                {
                    method: "POST",
                    body: JSON.stringify(data),
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            const _response = await response.json();

            if (!response.ok) {
                toastStore.set({
                    message: _response.message,
                    type: ToastType.ERROR,
                });
                appInsights.trackException({
                    error: new Error(_response.message),
                }); // Track exception
                return;
            }

            toastStore.set({
                message: "Notification will be sent successfully",
                type: ToastType.SUCCESS,
            });

            // Track custom event for notification sent
            appInsights.trackEvent({
                name: "NotificationSent",
                properties: {
                    agentId,
                    emailValue,
                },
            });
        } catch (error) {
            console.log("error", error);
            toastStore.set({
                message: "Ops! Something went wrong",
                type: ToastType.ERROR,
            });
            appInsights.trackException({ error: new Error(`${error}`) }); // Track exception
        }
    };

    const onQuestionnaire = (questionnaire: Questionnaire) => {
        questionnaireStore.set(questionnaire);

        // Track custom event for questionnaire selected
        appInsights.trackEvent({
            name: "QuestionnaireSelected",
            properties: {
                agentId,
                questionnaireId: questionnaire.id,
                questionnaireMessage: questionnaire.message,
            },
        });
    };
    const trackLinkClick = () => {
        appInsights.trackEvent({
            name: "VSCodeLinkClicked",
            properties: {
                agentId,
            },
        });
    };

</script>

<div class="my-auto grid gap-4 lg:grid-cols-2">
    <div class="lg:col-span-1">
        <div class="inline-flex flex-col">
            <div class="inline-flex flex-row">
                <img
                    class="mr-2 aspect-square size-14 rounded border dark:border-gray-700"
                    src={agentLogo}
                    alt=""
                />
                <p class="mb-3 flex items-center text-2xl font-semibold">
                    {agentDisplayName}
                </p>
            </div>
            <p class="text-base text-gray-600 dark:text-gray-400 mt-1">
                {agentDescription}
            </p>
        </div>
    </div>
    <div
        class="lg:col-span-2 lg:pl-24 flex justify-between sm:justify-end space-x-2"
    >
        <a
            href="https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt"
            target="_blank"
            class="flex items-center justify-center h-12 px-6 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg"
        >
            <IconVisualStudio />
            <div class="text-sm text-white">VSCode</div>
        </a>
        <button
            class="flex items-center justify-center h-12 px-6 font-medium transition-colors duration-150 ease-in-out border bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-md dark:hover:bg-gray-700 text-gray-600 hover:bg-gray-100 border-gray-800 space-x-2 shadow-lg"
            on:click={() => showModalSettings = true}>
            <Icon icon="bi:gear-fill" width="24px" height="24px" />
            <div class="text-sm text-white">Settings</div>
        </button>
    </div>

    <div class="lg:col-span-3 lg:mt-6">
        {#if !agentIsDataSourceIndexed}
            <!-- <div class="overflow-hidden rounded-xl border dark:border-gray-800">
                <div class="flex p-3">
                    <div
                        class="flex items-center gap-1.5 font-semibold max-sm:text-smd"
                    >
                        Your agent will be ready in a few minutes. Please drop your email to be notified.
                    </div>
                    <p
                        class="btn ml-auto flex self-start rounded-full bg-gray-100 p-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-600"
                    >
                        <Icon
                            icon="material-symbols:info"
                            width="24px"
                            height="24px"
                        />
                    </p>
                </div>
                <div class="flex px-3 pb-3">
                    <input
                        bind:value={emailValue}
                        autocomplete="email"
                        autocorrect="off"
                        autocapitalize="none"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-1/2 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        name="email"
                        placeholder="Email address"
                        type="text"
                    />
                    <button
                        on:click={notify}
                        class="flex items-center justify-center w-full md:w-auto h-12 px-8 mx-2 font-medium text-white transition-colors duration-150 ease-in-out bg-blue-800 rounded-md hover:bg-blue-700 space-x-2 shadow-lg"
                        >Notify</button
                    >
                </div>
            </div> -->
            {:else}
            <div class="grid gap-3 lg:grid-cols-2 lg:gap-5 mt-3">
                {#each questionnaires as questionnaire}
                    <button
                        class={`relative rounded-xl border ${questionnaire.id === "generate-summary" ? "bg-[#497BEF] text-gray-300 border-[#497BEF] hover:bg-[#287CEB] hover:border-[#287CEB]" : "bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-gray-600 hover:bg-gray-100"} p-3 max-xl:text-sm xl:p-3.5`}
                        on:click={() => onQuestionnaire(questionnaire)}
                    >
                        {questionnaire.message}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<SettingsAgent
    bind:showModalSettings
    bind:agentDisplayName
    bind:agentDescription
    bind:agentId
    bind:agentLogo
    bind:agentDataSources
    onClose={() => {
        showModalSettings = false;
    }}
/>