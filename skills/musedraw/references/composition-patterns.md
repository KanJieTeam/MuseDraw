# Composition patterns · 构图模式

Pick the pattern from the question the reader brings. Each row names the block
(or primitives) and a gallery scene to copy.

## Research 科研

| Reader asks | Pattern | Build with | Copy |
| --- | --- | --- | --- |
| 研究怎么开展？(基金/开题) | Question → parallel aims → integration → outcomes | zones + nodes, trunk edges | `59-nsfc-roadmap-journal` |
| How were studies selected? | PRISMA 2020: stage rail + main column + exclusions | nodes, side rail zones | `56-prisma-journal` |
| Who was randomised and lost? | CONSORT: enrolment → two arms → analysis | nodes, two columns | `57-consort-journal` |
| What is the model? | Stacked blocks read bottom-up, residuals dashed | nodes + `via` | `58-transformer-editorial` |
| Which constructs predict what? | SEM: ellipses for latents, boxes for items, β on paths | `circle` nodes, `curve` edges | `68-sem-tam-newsprint` |
| How was the scale built? | Numbered phases with item counts shrinking | nodes + bar texts | `69-scale-development-journal` |
| What happens to the samples? | Pipeline lanes with QC gates | nodes, zones | `63-scrnaseq-terminal`, `62-crispr-workflow-journal` |
| When will each aim finish? | Gantt with groups and milestones | `gantt` block | `77-grant-timeline-enterprise` |
| How do X, M, W, Y relate? | Conceptual model, moderator arrow onto a path | nodes + `lines` | `78-moderated-mediation-journal` |

## Office 办公

| Reader asks | Pattern | Build with | Copy |
| --- | --- | --- | --- |
| 目标怎么拆？ | O → KR → initiatives, progress in tags | `tree` | `16-okr-tree-enterprise` |
| 谁在哪一步卡住？ | Swimlane, decisions as diamonds, bottleneck in accent | `swimlane` | `18-procurement-swimlane-enterprise` |
| 问题原因在哪？ | Fishbone: 6M categories | `fishbone` | `25-fishbone-falls-newsprint` |
| 改进怎么闭环？ | PDCA cycle with numbers at the centre | `cycle` | `24-pdca-nursing-pastel` |
| 客户经历了什么？ | Journey: stages, actions, feeling curve, opportunities | zones + `paths` | `20-customer-journey-terracotta` |
| 发布要准备什么？ | Mind map, risks in red | `mindmap` | `35-launch-mindmap-whiteboard` |
| 公文怎么流转？ | Columns with vertical CJK labels | zones + nodes | `45-document-flow-ink-wash` |
| 一节课怎么上？ | Five stages with minutes and teacher moves | nodes + steps | `38-good-lesson-chalkboard` |
| What do we ship when? | Roadmap Gantt by track | `gantt` | `19-product-roadmap-product` |
| Who decides? | RACI table | `table` | `28-raci-swiss` |
| Which risks first? | 5×5 heat map + register | `matrix` + `table` | `40-risk-heatmap-product` |

## Engineering 工程

| Reader asks | Pattern | Copy |
| --- | --- | --- |
| How does a request flow? | Numbered path with margin notes | `01-rag-editorial` |
| Where is it deployed? | Region → cluster → AZ, data tier as a bus | `02-kubernetes-blueprint` |
| What happens step by step? | Big numerals + explanation list | `04-card-payment-swiss` |
| How does the loop work? | Cycle inside a runtime boundary, tools outside | `08-ai-agent-aurora` |
| Which containers talk? | C4 container view, typed boxes, protocol labels | `13-food-delivery-c4` |

## Rules that make any pattern work

1. One focal element, maybe two. Everything else is `default`.
2. Number the path when order matters; explain the numbers in notes.
3. Bundle parallel edges into a trunk (`toAt: 0.5`) instead of a comb.
4. Keep labels short on the node; move detail to `sub` or a note.
5. If more than ~25 nodes, split into an overview and a detail figure.
