import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductDetailClient } from "@/app/products/[slug]/product-detail-client";
import { getProductPage, productPages } from "@/lib/product-pages";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return productPages.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductPage(slug);

  if (!product) {
    return {
      title: "Product - Tradivix",
    };
  }

  return {
    title: `${product.title} - Tradivix`,
    description: product.summary.en,
  };
}

export default async function ProductPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductPage(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = productPages.filter((item) => item.slug !== product.slug);

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}
