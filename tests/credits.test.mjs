import test from "node:test";
import assert from "node:assert/strict";
import { UNITS_PER_CREDIT, WELCOME_CREDITS, creditAmountToUnits, normalizeTokenUsage, modelRates, reserveCostUnits, usageCostUnits } from "../lib/credits.ts";

test("100 credits equal $1 and the welcome grant is exactly 30 credits",()=>{
    assert.equal(100*UNITS_PER_CREDIT/1e9,1);
    assert.equal(WELCOME_CREDITS,30);
    assert.equal(WELCOME_CREDITS*UNITS_PER_CREDIT/1e9,0.3);
});
test("Luna 2000 input + 300 output costs $0.00035 / 0.035 credits",()=>{
    const usage=normalizeTokenUsage({prompt_tokens:2000,completion_tokens:300});
    assert.equal(usageCostUnits("gpt-6-luna",usage),350000);
    assert.equal(usageCostUnits("gpt-6-luna",usage)/UNITS_PER_CREDIT,0.035);
});
test("cache reads and mixed writes are exclusive input categories",()=>{
    const u=normalizeTokenUsage({input_tokens:12000,output_tokens:2000,input_tokens_details:{cached_tokens:4000,cache_write_tokens:7000,cache_write_tokens_details:{ttl_30m_tokens:3000,ttl_12h_tokens:4000}}});
    assert.equal(usageCostUnits("gpt-6-luna",u),2515000);
});
test("Chat Completions cache writes use the explicitly requested lifetime",()=>{
    const usage={prompt_tokens:2000,completion_tokens:100,prompt_tokens_details:{cached_tokens:500,cache_write_tokens:1000}};
    assert.throws(()=>normalizeTokenUsage(usage),/INVALID_USAGE/);
    assert.equal(usageCostUnits("gpt-6-luna",normalizeTokenUsage(usage,"30m")),230000);
    assert.equal(usageCostUnits("gpt-6-luna",normalizeTokenUsage(usage,"12h")),355000);
});
test("nano pricing includes reasoning only once",()=>{
    const u=normalizeTokenUsage({prompt_tokens:2000,completion_tokens:300,prompt_tokens_details:{cached_tokens:1000},completion_tokens_details:{reasoning_tokens:250}});
    assert.equal(usageCostUnits("gpt-5-nano",u),175000);
});
test("long-context pricing switches strictly after 272K input tokens",()=>{
    assert.equal(modelRates("gpt-6-luna",272000).input,100);
    assert.equal(modelRates("gpt-6-luna",272001).input,200);
    assert.equal(modelRates("gpt-6-luna",272001).output,750);
});
test("reservation covers ordinary input, all cache-write lifetimes and maximum output",()=>{
    for(const model of ["gpt-6-luna","gpt-5-nano"])for(const input of [1,2000,272001]){
        const cap=reserveCostUnits(model,input,4096);
        assert.ok(cap>=usageCostUnits(model,{input,output:4096,cached:0,write30m:0,write12h:0}));
        if(model==="gpt-6-luna")assert.ok(cap>=usageCostUnits(model,{input,output:4096,cached:0,write30m:0,write12h:input}));
    }
});
test("missing, negative, non-integral, overlapping and unknown usage is not guessed",()=>{
    for(const value of [null,{}, {prompt_tokens:-1,completion_tokens:1},{prompt_tokens:2.5,completion_tokens:1},{prompt_tokens:3,completion_tokens:1,prompt_tokens_details:{cached_tokens:4}},{prompt_tokens:10,completion_tokens:1,prompt_tokens_details:{cache_write_tokens:5,cache_write_tokens_details:{ttl_30m_tokens:4}}}])assert.throws(()=>normalizeTokenUsage(value),/INVALID_USAGE/);
    assert.throws(()=>modelRates("unpriced-model",100),/UNPRICED_MODEL/);
});
test("tiny requests accumulate without whole-credit rounding",()=>{
    const cost=usageCostUnits("gpt-6-luna",{input:1,output:1,cached:0,write30m:0,write12h:0});
    assert.equal(cost,600);
    assert.equal(cost*1000/UNITS_PER_CREDIT,0.06);
    assert.equal(creditAmountToUnits(0.001),10000);
    assert.equal(creditAmountToUnits(-30),-300000000);
    for(const amount of [0,NaN,Infinity,"30",100001])assert.throws(()=>creditAmountToUnits(amount));
});
