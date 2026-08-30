import type { Request, Response } from 'express';

import * as blogSvc from '../../../services/blogService.js';
import * as svc from '../inventoryService.js';
import { getCompany } from '../../../services/settingsService.js';
import { notFound, pathParam } from '../../../core/utils/apiError.js';

/**
 * Public storefront API — mounted BEFORE `requireAuth` in apiRoutes.ts so
 * anonymous visitors can browse the catalog.
 *
 * Security contract: only marketing-safe fields leave this controller.
 * Cost prices, consignment prices, stock levels and internal identifiers
 * (registration number, emergency contacts, owners) are admin-only data and
 * must never be added to these responses.
 */

export async function listPublicItems(_req: Request, res: Response): Promise<void> {
    const [rows, categories] = await Promise.all([svc.listItems(), svc.listCategories()]);
    const labelMap = new Map(categories.map((c) => [c.id, c.label]));
    res.json(
        rows.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            category: r.category,
            categoryLabel: labelMap.get(r.category),
            retailPrice: r.retailPrice,
            sizes: r.sizes,
            colors: r.colors,
            fabric: r.fabric,
            imageUrl: r.imageUrl,
            images: r.images,
            // Availability as a boolean — exact stock counts stay private.
            inStock: r.stockQuantity > 0,
        })),
    );
}

export async function listPublicCategories(_req: Request, res: Response): Promise<void> {
    const rows = await svc.listCategories();
    res.json(rows.map((r) => ({ id: r.id, label: r.label })));
}

export async function getPublicCompany(_req: Request, res: Response): Promise<void> {
    const company = await getCompany();
    res.json({
        name: company.name,
        slogan: company.slogan,
        brandName: company.brandName,
        tagline: company.tagline,
        website: company.website,
        instagram: company.instagram,
        telegram: company.telegram,
        address: company.address || company.workshopAddress,
        phone: company.phone || company.workshopPhone,
        secondaryPhone: company.secondaryPhone,
        establishedYear: company.establishedYear,
    });
}

export async function listPublicBlogPosts(_req: Request, res: Response): Promise<void> {
    res.json(await blogSvc.listPosts(false));
}

export async function getPublicBlogPost(req: Request, res: Response): Promise<void> {
    const slug = pathParam(req, 'slug', 'آدرس مطلب');
    const post = await blogSvc.getPublishedPostBySlug(slug);
    if (!post) throw notFound('مطلب یافت نشد');
    res.json(post);
}
