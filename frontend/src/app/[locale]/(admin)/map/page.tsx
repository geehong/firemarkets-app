import PerformanceTreeMapWrapper from "@/components/charts/treemap/PerformanceTreeMapWrapper";

export default function MapPage() {
    return (
        <div className="p-4 md:p-6 2xl:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-title-md2 font-semibold text-black dark:text-white">
                    Market Map
                </h2>
            </div>

            <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
                <PerformanceTreeMapWrapper height={800} />
            </div>
        </div>
    );
}
