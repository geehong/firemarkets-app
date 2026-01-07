import AssetsMainView from '@/components/assets/AssetsMainView'

export default async function AssetsPage(
    props: {
        params: Promise<{ locale: string }>
    }
) {
    const params = await props.params;

    const {
        locale
    } = params;

    return <AssetsMainView locale={locale} />
}
