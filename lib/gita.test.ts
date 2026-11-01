import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  getGitaVerses,
  getVerse,
  getVersesByChapter,
  searchGitaVerses,
  GITA_CHAPTERS,
} from './gita.ts'

describe('Bhagavad Gita CSV Parser and Service', () => {
  test('successfully parses all 701 verses across 18 chapters', () => {
    const verses = getGitaVerses()
    assert.equal(verses.length, 701)

    // Check chapters are 1 through 18
    const chapters = new Set(verses.map((v) => v.chapter))
    assert.equal(chapters.size, 18)
    for (let c = 1; c <= 18; c++) {
      assert.equal(chapters.has(c), true)
    }
  })

  test('validates GITA_CHAPTERS matches verse counts', () => {
    const verses = getGitaVerses()
    for (const ch of GITA_CHAPTERS) {
      const chVerses = verses.filter((v) => v.chapter === ch.chapter)
      assert.equal(chVerses.length, ch.verseCount)
    }
  })

  test('retrieves specific verse accurately', () => {
    const verse2_47 = getVerse(2, 47)
    assert.ok(verse2_47)
    assert.equal(verse2_47?.chapter, 2)
    assert.equal(verse2_47?.verse, 47)
    assert.ok(verse2_47?.sanskrit.includes('कर्मण्येवाधिकारस्ते'))
    assert.ok(verse2_47?.english.includes('work only'))
    assert.ok(verse2_47?.transliteration.includes('karmaṇyevādhikāraste'))
  })

  test('searches verses by chapter:verse syntax', () => {
    const res = searchGitaVerses({ query: '18:78' })
    assert.equal(res.total, 1)
    assert.equal(res.results[0].chapter, 18)
    assert.equal(res.results[0].verse, 78)
    assert.ok(res.results[0].sanskrit.includes('यत्र योगेश्वरः कृष्णो'))
  })

  test('searches verses by transliteration and text queries', () => {
    const res = searchGitaVerses({ query: 'yatra yogesvarah' })
    assert.ok(res.total >= 1)
    assert.ok(res.results.some((r) => r.chapter === 18 && r.verse === 78))
  })
})
