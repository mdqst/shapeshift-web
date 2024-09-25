import { Box, Flex, Grid, GridItem, Heading, Skeleton, Text } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { thorchainSaversOpportunityIdsResolver } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers'
import { SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { CardWithSparkline } from './components/CardWithSparkline'
import { LpGridItem } from './components/LpCard'
import {
  useMarketsQuery,
  useRecentlyAddedQuery,
  useTopMoversQuery,
  useTrendingQuery,
} from './hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from './hooks/usePortalsAssetsQuery'
import { MarketsHeader } from './MarketsHeader'

type RowProps = {
  title: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
  children: (selectedChainId: ChainId | undefined) => React.ReactNode
}

const containerPaddingX = { base: 4, xl: 0 }

const gridTemplateColumnSx = { base: 'minmax(0, 1fr)', md: 'repeat(9, 1fr)' }
const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }

const colSpanSparklineSx = { base: 1, md: 3 }
const colSpanSx = { base: 1, md: 2 }

const rowSpanSparklineSx = { base: 1, md: 2 }

const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
}> = ({ assetIds, selectedChainId, isLoading }) => {
  const history = useHistory()
  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, 7),
    [assetIds, selectedChainId],
  )

  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )

  if (isLoading)
    return (
      <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
        {new Array(8).fill(null).map((_, index) => (
          <GridItem colSpan={index === 0 ? colSpanSparklineSx : colSpanSx}>
            <Skeleton isLoaded={false}>
              <AssetCard onClick={noop} assetId={ethAssetId} />
            </Skeleton>
          </GridItem>
        ))}
      </Grid>
    )

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) =>
        index === 0 ? (
          <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
            <CardWithSparkline key={assetId} assetId={assetId} onClick={handleCardClick} />
          </GridItem>
        ) : (
          <GridItem colSpan={colSpanSx}>
            <AssetCard key={assetId} assetId={assetId} onClick={handleCardClick} />
          </GridItem>
        ),
      )}
    </Grid>
  )
}

const LpGrid: React.FC<{ assetIds: AssetId[]; selectedChainId?: ChainId; isLoading: boolean }> = ({
  assetIds,
  selectedChainId,
  isLoading,
}) => {
  const history = useHistory()
  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )
  const { data: portalsAssets } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, 7),
    [assetIds, selectedChainId],
  )

  if (isLoading) {
    return (
      <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
        {new Array(8).fill(null).map((_, index) => (
          <GridItem colSpan={index === 0 ? colSpanSparklineSx : colSpanSx}>
            <Skeleton isLoaded={false}>
              <AssetCard onClick={noop} assetId={ethAssetId} />
            </Skeleton>
          </GridItem>
        ))}
      </Grid>
    )
  }

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) => {
        const maybePortalsApy = portalsAssets?.byId[assetId]?.metrics.apy
        const maybePortalsVolume = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

        return (
          <LpGridItem
            assetId={assetId}
            index={index}
            onClick={handleCardClick}
            apy={maybePortalsApy}
            volume={maybePortalsVolume}
          />
        )
      })}
    </Grid>
  )
}

const OneClickDefiAssets: React.FC<{
  selectedChainId: ChainId | undefined
}> = ({ selectedChainId }) => {
  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  return (
    <LpGrid
      assetIds={portalsAssets?.ids ?? []}
      selectedChainId={selectedChainId}
      isLoading={isPortalsAssetsLoading}
    />
  )
}

const ThorchainAssets: React.FC<{
  selectedChainId: ChainId | undefined
}> = ({ selectedChainId }) => {
  const dispatch = useAppDispatch()
  const { data: thorchainAssetIdsData, isLoading: isThorchainAssetIdsDataLoading } = useQuery({
    queryKey: ['thorchainAssets'],
    queryFn: thorchainSaversOpportunityIdsResolver,
    staleTime: Infinity,
    select: pools => pools.data,
  })

  useEffect(() => {
    ;(async () => {
      await dispatch(
        opportunitiesApi.endpoints.getOpportunityIds.initiate(
          {
            defiType: DefiType.Staking,
            defiProvider: DefiProvider.ThorchainSavers,
          },
          { forceRefetch: true },
        ),
      )

      await dispatch(
        opportunitiesApi.endpoints.getOpportunitiesMetadata.initiate(
          [
            {
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.ThorchainSavers,
            },
          ],
          { forceRefetch: true },
        ),
      )
    })()
  }, [dispatch])

  return (
    <LpGrid
      assetIds={thorchainAssetIdsData ?? []}
      selectedChainId={selectedChainId}
      isLoading={isThorchainAssetIdsDataLoading}
    />
  )
}

const Row: React.FC<RowProps> = ({ title, subtitle, supportedChainIds, children }) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))
  const isSolanaEnabled = useAppSelector(state => selectFeatureFlag(state, 'Solana'))

  const chainIds = useMemo(() => {
    if (!supportedChainIds)
      return Object.values(KnownChainIds).filter(chainId => {
        if (!isArbitrumNovaEnabled && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
        if (!isSolanaEnabled && chainId === KnownChainIds.SolanaMainnet) return false
        return true
      })

    return supportedChainIds
  }, [isArbitrumNovaEnabled, isSolanaEnabled, supportedChainIds])

  return (
    <Box mb={8}>
      <Flex justify='space-between' align='center' mb={4}>
        <Box me={4}>
          <Heading size='md' mb={1}>
            {title}
          </Heading>
          {subtitle && (
            <Text fontSize='sm' color='gray.500'>
              {subtitle}
            </Text>
          )}
        </Box>
        <ChainDropdown
          chainIds={chainIds}
          chainId={selectedChainId}
          onClick={setSelectedChainId}
          showAll
          includeBalance
        />
      </Flex>
      {children(selectedChainId)}
    </Box>
  )
}

export const Recommended: React.FC = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])

  // Fetch for all chains here so we know which chains to show in the dropdown
  const { data: allPortalsAssets } = usePortalsAssetsQuery({
    chainIds: undefined,
  })

  const { data: topMoversData, isLoading: isTopMoversDataLoading } = useTopMoversQuery()
  const { data: trendingData, isLoading: isTrendingDataLoading } = useTrendingQuery()
  const { data: recentlyAddedData, isLoading: isRecentlyAddedDataLoading } = useRecentlyAddedQuery()
  const { data: highestVolumeData, isLoading: isHighestVolumeDataLoading } = useMarketsQuery({
    orderBy: 'volume_desc',
  })
  const { data: marketCapData, isLoading: isMarketCapDataLoading } = useMarketsQuery({
    orderBy: 'market_cap_desc',
  })

  const rows = useMemo(
    () => [
      {
        title: translate('markets.categories.tradingVolume.title'),
        subtitle: translate('markets.categories.tradingVolume.subtitle'),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={highestVolumeData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isHighestVolumeDataLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.marketCap.title'),
        subtitle: translate('markets.categories.marketCap.subtitle'),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={marketCapData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isMarketCapDataLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.trending.title'),
        subtitle: translate('markets.categories.trending.subtitle', { percentage: '10' }),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={trendingData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isTrendingDataLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.topMovers.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={topMoversData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isTopMoversDataLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.recentlyAdded.title'),
        // TODO(gomes): loading state when implemented
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={recentlyAddedData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isRecentlyAddedDataLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.oneClickDefiAssets.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <OneClickDefiAssets selectedChainId={selectedChainId} />
        ),
        supportedChainIds: allPortalsAssets?.chainIds,
      },
      {
        title: translate('markets.categories.thorchainDefi.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <ThorchainAssets selectedChainId={selectedChainId} />
        ),
        supportedChainIds: SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS,
      },
    ],
    [
      allPortalsAssets?.chainIds,
      highestVolumeData?.ids,
      isHighestVolumeDataLoading,
      isMarketCapDataLoading,
      isRecentlyAddedDataLoading,
      isTopMoversDataLoading,
      isTrendingDataLoading,
      marketCapData?.ids,
      recentlyAddedData?.ids,
      topMoversData?.ids,
      translate,
      trendingData?.ids,
    ],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box py={4} px={containerPaddingX}>
        {rows.map((row, i) => (
          <Row
            key={i}
            title={row.title}
            subtitle={row.subtitle}
            supportedChainIds={row.supportedChainIds}
          >
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}