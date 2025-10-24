import Detail from "src/routes/Detail"
import { filterPosts, optimizeRecordMap } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import { getRecordMap, getPosts, getPostBySlug } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { queryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  console.log('\n🔍 [getStaticPaths] Generating static paths...')
  
  const posts = await getPosts()
  console.log(`🔍 [getStaticPaths] Total posts: ${posts.length}`)
  
  const filteredPost = filterPosts(posts, filter)
  console.log(`🔍 [getStaticPaths] Filtered posts: ${filteredPost.length}`)
  
  const paths = filteredPost.map((row) => `/${row.slug}`)
  console.log(`🔍 [getStaticPaths] Generated paths:`, paths)
  
  const hasAbout = paths.includes('/about')
  console.log(`🔍 [getStaticPaths] About page included: ${hasAbout}`)

  return {
    paths,
    fallback: true,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = context.params?.slug

  console.log(`\n🔍 [getStaticProps] Processing slug: "${slug}"`)

  try {
    const posts = await getPosts()
    console.log(`🔍 [getStaticProps] Total posts from Notion: ${posts.length}`)
    
  // Ensure the prefetched posts used in client cache include both Posts and Papers
  // so that navigating back to the feed preserves Paper entries.
  const feedPosts = filterPosts(posts, { acceptStatus: ["Public"], acceptType: ["Post", "Paper"] })
  await queryClient.prefetchQuery(queryKey.posts(), () => feedPosts)

    console.log(`🔍 [getStaticProps] Filtering posts with detail filter:`, filter)
    const detailPosts = filterPosts(posts, filter)
    console.log(`🔍 [getStaticProps] Detail posts after filter: ${detailPosts.length}`)
    
    let postDetail = detailPosts.find((t: any) => t.slug === slug)
    
    if (postDetail) {
      console.log(`✅ [getStaticProps] Found post in filtered list:`, {
        id: postDetail.id,
        title: postDetail.title,
        slug: postDetail.slug,
        status: postDetail.status,
        type: postDetail.type
      })
    }
    
    // If post is not found in build-time posts, try to fetch directly from Notion
    if (!postDetail) {
      console.log(`⚠️  [getStaticProps] Post not found in build-time list, searching Notion for slug: ${slug}`)
      const notionPost = await getPostBySlug(slug as string)
      
      // If still not found, return 404
      if (!notionPost) {
        console.log(`❌ [getStaticProps] Post with slug ${slug} not found in Notion`)
        return {
          notFound: true,
        }
      }
      
      console.log(`✅ [getStaticProps] Successfully found post in Notion: ${notionPost.title}`)
      postDetail = notionPost
    }

    try {
      const rawRecordMap = await getRecordMap(postDetail?.id!)
      const recordMap = optimizeRecordMap(rawRecordMap)

      await queryClient.prefetchQuery(queryKey.post(`${slug}`), () => ({
        ...postDetail,
        recordMap,
      }))

      return {
        props: {
          dehydratedState: dehydrate(queryClient),
        },
        revalidate: CONFIG.revalidateTime,
      }
    } catch (recordMapError) {
      console.error(`Failed to get record map for ${slug}:`, recordMapError)
      
      // Return basic post data without recordMap as fallback
      await queryClient.prefetchQuery(queryKey.post(`${slug}`), () => ({
        ...postDetail,
        recordMap: null,
      }))

      return {
        props: {
          dehydratedState: dehydrate(queryClient),
        },
        revalidate: 60, // Shorter revalidate time for failed pages
      }
    }
  } catch (error) {
    console.error(`Error in getStaticProps for ${slug}:`, error)
    
    // Return 404 if everything fails
    return {
      notFound: true,
    }
  }
}

const DetailPage: NextPageWithLayout = () => {
  const post = usePostQuery()

  if (!post) return <CustomError />

  const image =
    post.thumbnail ??
    CONFIG.ogImageGenerateURL ??
    `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(post.title)}.png`

  const date = post.date?.start_date || post.createdTime || ""

  const meta = {
    title: post.title,
    date: new Date(date).toISOString(),
    image: image,
    description: post.summary || "",
    type: post.type[0],
    url: `${CONFIG.link}/${post.slug}`,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Detail />
    </>
  )
}

DetailPage.getLayout = (page) => {
  return <>{page}</>
}

export default DetailPage
