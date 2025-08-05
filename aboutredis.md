Bucket4j 8.14.0 Reference
version 8.14.0,
2024-08-18 10
Table of Contents
1. About Bucket4j
1.1. What is Bucket4j
1.2. Bucket4j basic features
1.3. Bucket4j distributed features
2. Basic functionality
2.1. Concepts
2.1.1. Bucket
2.1.2. BucketConfiguration
2.1.3. Limitation/Bandwidth
2.1.4. Refill styles
2.1.5. BucketState
2.1.6. BucketBuilder
2.2. Quick start examples
2.2.1. How to dependency to Bucket4j
2.2.2. Limiting the rate of access to REST API
2.2.3. Specifying initial amount of tokens
2.2.4. Returning tokens back to bucket
2.2.5. Customizing time measurement - choosing nanotime time resolution
2.2.6. Customizing time measurement - Specify custom time measurement strategy
2.2.7. Blocking API example
2.3. Listening for bucket events
2.3.1. What can be listened
2.3.2. Listener API - corner cases
2.3.3. Specify listener to local bucket at build time
2.3.4. Specify listener to distributed bucket at build time
2.3.5. Specify listener to async distributed bucket at build time
2.3.6. Specify listener to distributed bucket at proxy-manager build time
2.3.7. Specify listener to bucket at use time.
2.3.8. Example of integration with Dropwizard metrics-core
2.4. Verbose/Debug API
2.4.1. Verbose API entry-points
2.4.2. Principles of result decoration
2.4.3. Example of Verbose API usage
2.5. On-the-fly configuration replacement
2.5.1. Why configuration replacement is not trivial?
2.5.2. Taking control over replacement process via bandwidth identifiers
2.5.3. TokensInheritanceStrategy explanation
2.6. Generic production checklist
2.6.1. Be wary of long periods
2.6.2. Be wary of short-timed bursts
2.7. Technical limitations
2.7.1. Maximum refill rate
2.7.2. Limitation for refill period
3. Distributed facilities
3.1. Production checklist especially in the context of distributed systems
3.2. Integrations with in-memory grids
3.2.1. JCache integration
Example 1 - limiting access to HTTP server by IP address
Example 2 - limiting access to service by contract agreements
Why JCache specification is not enough in modern stacks and since 3.0 were introduced the dedicated modules for Infinispan, Hazelcast, Coherence and Ignite?
Verification of compatibility with a particular JCache provider is your responsibility
3.2.2. Hazelcast integration
Dependencies
General compatibility matrix principles:
Example of Bucket instantiation
Configuring flexible per entry expiration
Configuring Custom Serialization for Bucket4j library classes
Configuring Custom Serialization using a Hazelcast standalone cluster
Support for externally managed Hazelcast without classpath access
Known issues related with Docker and(or) SpringBoot
3.2.3. Apache Ignite integration
Dependencies
Example of Bucket instantiation via IgniteProxyManager
Example of Bucket instantiation via Thin Client
Example of Bucket instantiation of via Thin Client and IgniteThinClientCasBasedProxyManager
Notes about expiration-policy
3.2.4. Infinispan integration
Dependencies
General compatibility matrix principles::
Special notes for Infinispan 10.0+
Example of Bucket instantiation for EmbeddedCacheManager
Example of Bucket instantiation for RemoteCacheManager(Hot Rod client)
3.2.5. Oracle Coherence integration
Dependencies
Example of Bucket instantiation
Configuring POF serialization for Bucket4j library classes
3.3. Bucket4j-Redis
3.3.1. Lettuce integration
Dependencies
Example of Bucket instantiation via LettuceBasedProxyManager
3.3.2. Redisson integration
Dependencies
Example of Bucket instantiation via RedissonBasedProxyManager
3.3.3. Jedis integration
Dependencies
Example of Bucket instantiation via JedisBasedProxyManager
3.4. JDBC integrations
3.4.1. Overriding table and columns naming scheme
3.4.2. Overriding type of primary key
3.4.3. Expiration Policy
3.4.4. PostgreSQL integration
Dependencies
DDL example
PostgreSQLSelectForUpdateBasedProxyManager
PostgreSQLAdvisoryLockBasedProxyManager
3.4.5. MySQL integration
Dependencies
DDL example
Example of Bucket instantiation
3.4.6. MariaDB integration
Dependencies
DDL example
Example of Bucket instantiation
3.4.7. Oracle database integration
Dependencies
DDL example
Example of Bucket instantiation
3.4.8. MicrosoftSQLServer integration
Dependencies
DDL example
Example of Bucket instantiation
3.4.9. IBM Db2 integration
Dependencies
DDL example
Example of Bucket instantiation
4. Distributed facilities advanced topics
4.1. Asynchronous API
4.1.1. Example - limiting the rate of access to the asynchronous servlet
4.2. Implicit configuration replacement
4.3. Framework to implement custom work with your database
1. About Bucket4j
1.1. What is Bucket4j
Bucket4j is a Java rate-limiting library that is mainly based on the token-bucket algorithm, which is by the de-facto standard for rate-limiting in the IT industry.

Important
Bucket4j is more than a direct implementation of token-bucket
Its math model provides several useful extensions that are not mentioned in the classic token-bucket interpretations, such as multiple limits per bucket or overdraft. These math extensions will be detailed described later.
You can read more about the token bucket by following links:

Token bucket - Wikipedia page describes the token-bucket algorithm in classical form.

Non-formal overview of token-bucket algorithm - the brief overview of the token-bucket algorithm.

1.2. Bucket4j basic features
Absolutely non-compromise precision - Bucket4j does not operate with floats or doubles, all calculations are performed in integer arithmetic, this feature protects end-users from calculation errors involved by rounding.

Effective implementation in terms of concurrency:

Bucket4j is good scalable for multi-threading cases it by default uses lock-free implementation.

At the same time, the library provides different concurrency strategies that can be chosen when a default lock-free strategy is not desired.

Effective API in terms of garbage collector footprint: Bucket4j API tries to use primitive types as much as it is possible in order to avoid boxing and other types of floating garbage.

Pluggable listener API that allows implementing monitoring and logging.

Rich diagnostic API that allows investigating internal state.

Rich configuration management - configuration of the bucket can be changed on the fly

1.3. Bucket4j distributed features
In addition to the basic features described above, Bucket4j provides the ability to implement rate-limiting in a cluster of JVMs:

Bucket4j out of the box supports any GRID solution which compatible with JCache API (JSR 107) specification.

Bucket4j provides the framework that allows you to quickly build integration with your own persistent technology like RDMS or key-value storage.

For clustered usage scenarios Bucket4j supports asynchronous API that extremely matters when going to distribute world because asynchronous API allows avoiding blocking your application threads each time when you need to execute Network request.

2. Basic functionality
2.1. Concepts
2.1.1. Bucket
Bucket is a rate-limiter that is implemented on the top of ideas of well-known Token Bucket algorithm. In the Bucket4j library code the Bucket is represented by interface io.github.bucket4j.Bucket.

Bucket aggregates the following parts:
BucketConfiguration specifies an immutable collection of limitation rules that are used by the bucket during its work.

BucketState the place where bucket stores mutable state like the amount of currently available tokens.

A bucket can be constructed via a special builder API BucketBuilder that is available by factory method:

Bucket bucket = Bucket.builder()
   .addLimit(...)
   .build();
2.1.2. BucketConfiguration
BucketConfiguration can be described as collection of limits that are used by Bucket during its job. Configuration In the Bucket4j library code the BucketConfiguration is represented by class io.github.bucket4j.BucketConfiguration. Configuration is immutable, there is no way to add or remove a limit to already created configuration. However, you can replace the configuration of the bucket via creating a new configuration instance and calling bucket.replaceConfiguration(newConfiguration).

Usually, you should not create BucketConfiguration directly(excepting the case with configuration replacement) because BucketBuilder does for you behind the scene, for rare cases when you need to create configuration directly you have to use ConfigurationBuilder that is available by factory method:

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(...)
    .build()
Important
Most users configure a single limit per configuration, but it is strongly recommended to analyze whether short-timed bursts problem can affect your application and if so then think about adding more limits.
2.1.3. Limitation/Bandwidth
Limitations that are used by bucket can be denoted in terms of bandwidths. Bandwidth is denoted by the following terms:

Capacity
Capacity is the term that is directly inherited from the classic interpretation of the token-bucket algorithm, this specifies how many tokens your bucket has. Capacity must be configured during building stage

Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(42))
    .build()
Refill
Refill specifies how fast tokens can be refilled after it was consumed from a bucket. Refill must be configured during building stage

Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(...).refillXXX(...)) // where XXX - is concrete refill style
    .build()
Bucket4j allows to choose different Refill types.

Initial tokens
Bucket4j extends the token-bucket algorithm by allowing to specify the initial amount of tokens for each bandwidth. By default, an initial amount of tokens equals to capacity and can be changed by withInitialTokens method:

Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(42).refillGreedy(1, ofSeconds(1)).initialTokens(13))
    .build()
Bandwidth ID
The identifier is the optional attribute that is null by default. You may prefer to assign identifiers for bandwidths if you use on-the-fly configuration replacement and your buckets have more than one bandwidth per bucket, otherwise, it is better to avoid using identifiers to preserve memory. The Identifier for bandwidth can be specified in following way:

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1000).refillGreedy(1000, ofMinutes(1)).id("business-limit"))
    .addLimit(limit -> limit.capacity(100).refillGreedy(100, ofSeconds(1)).id("burst-protection"))
    .build();
Note
Identifiers are critical for on-the-fly configuration replacement functionality because during replacement it needs to decide how correctly propagate information about already consumed tokens from the state before config replacement to the state after replacement. This is not a trivial task especially when the number of limits is changing.
2.1.4. Refill styles
Bucket4j allows to choose different styles in which consumed tokens are being refilled to bucket

There are four types of refill:
Greedy
This type of refill greedily regenerates tokens manner, it tries to add the tokens to the bucket as soon as possible. For example refill "10 tokens per 1 second" adds 1 token per every 100 milliseconds, in other words, the refill will not wait 1 second to regenerate a bunch of 10 tokens. The three refills below do refill of tokens with the same speed:

Bucket.builder().addLimit(limit -> limit.capacity(1000).refillGreedy(600, ofMinutes(1)))
Bucket.builder().addLimit(limit -> limit.capacity(1000).refillGreedy(10, ofSeconds(1)))
Bucket.builder().addLimit(limit -> limit.capacity(1000).refillGreedy(1, ofMillis(100)))
Intervally
This type of refill regenerates tokens in an interval manner. "Interval" in opposite to "greedy" will wait until the whole period will be elapsed before regenerating the whole amount of tokens.

Example:
// refills 100 tokens each minute
Bucket bucket = Bucket.builder().addLimit(limit -> limit.capacity(1000).refillIntervally(100, ofMinutes(1))).build();
IntervallyAligned
This type of refill regenerates that does refill of tokens in an interval manner. Interval" in opposite to "greedy" will wait until the whole period will be elapsed before regenerating the whole amount of tokens. In addition to Interval it is possible to specify the time when the first refill should happen. This type can be used to configure clear interval boundary i.e. start of the second, minute, hour, day.

Example:
// imagine that wall clock is 16:20, the first refill will happen at 17:00
// first refill will happen in the beginning of next hour
Instant firstRefillTime = ZonedDateTime.now()
  .truncatedTo(ChronoUnit.HOURS)
  .plus(1, ChronoUnit.HOURS)
  .toInstant();

Bucket bucket = Bucket.builder().addLimit(limit -> limit.capacity(400).refillIntervallyAligned(400, ofHours(1), firstRefillTime)).build();
RefillIntervallyAlignedWithAdaptiveInitialTokens
See javadocs.

2.1.5. BucketState
BucketState is the place where bucket stores own mutable state like:

Amount of currently available tokens.

Timestamp when the last refill was happen.

BucketState is represented by interface io.github.bucket4j.BucketState. Usually you never interact with this interface, excepting the cases when you want to get access to low-level diagnostic API that is described in Verbose/Debug API.

2.1.6. BucketBuilder
It was explicitly decided by library authors to not provide for end-users to construct a library entity via direct constructors.

It was to reason to split built-time and usage-time APIs:
To be able in the future to change internal implementations without breaking backward compatibility.

To provide Fluent Builder API that in our minds is a good modern library design pattern.

LocalBucketBuilder is a fluent builder that is specialized to construct the local buckets, where a local bucket is a bucket that holds an internal state just in memory and does not provide clustering functionality. Bellow an example of LocalBucketBuilder usage:

Bucket bucket = Bucket.builder()
    .addLimit(...)
    .withNanosecondPrecision()
    .withSynchronizationStrategy(SynchronizationStrategy.LOCK_FREE)
    .build()
2.2. Quick start examples
2.2.1. How to dependency to Bucket4j
The Bucket4j is distributed through Maven Central. You need to add the dependency to your project as described below in order to be able to compile and run examples

Maven dependency
<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-core</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-core</artifactId>
    <version>8.14.0</version>
</dependency>
Gradle dependency
implementation 'com.bucket4j:bucket4j-core:8.14.0'
Note
see Java compatibility matrix if you need for build that is compatible with Java 8
2.2.2. Limiting the rate of access to REST API
Imagine that you develop yet another social network, and you want to provide REST API for third-party developers. To protect your system from overloading you want to introduce the following limitation:

The bucket size is 50 calls (which cannot be exceeded at any given time), with a "refill rate" of 10 calls per second that continually increases tokens in the bucket. In other words. if the client app averages 10 calls per second, it will never be throttled, and moreover, the client has overdraft equals to 50 calls which can be used if the average is a little bit higher than 10 calls/sec in a short time period.

Constructing the bucket to satisfy the requirements above is a little bit more complicated than for previous examples, because we have to deal with overdraft, but it is not rocket science:

import io.github.bucket4j.Bucket;

public class ThrottlingFilter implements javax.servlet.Filter {

    private Bucket createNewBucket() {
         return Bucket.builder()
            .addLimit(limit -> limit.capacity(50).refillGreedy(10, Duration.ofSeconds(1)))
            .build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        HttpSession session = httpRequest.getSession(true);

        String appKey = SecurityUtils.getThirdPartyAppKey();
        Bucket bucket = (Bucket) session.getAttribute("throttler-" + appKey);
        if (bucket == null) {
            bucket = createNewBucket();
            session.setAttribute("throttler-" + appKey, bucket);
        }

        // tryConsume returns false immediately if no tokens available with the bucket
        if (bucket.tryConsume(1)) {
            // the limit is not exceeded
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            // limit is exceeded
            HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
            httpResponse.setContentType("text/plain");
            httpResponse.setStatus(429);
            httpResponse.getWriter().append("Too many requests");
        }
    }

}
If you want to provide more information to the end-user about the state of the bucket, then the last fragment of code above can be rewritten in the following way:

        HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            // the limit is not exceeded
            httpResponse.setHeader("X-Rate-Limit-Remaining", "" + probe.getRemainingTokens());
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            // limit is exceeded
            HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
            httpResponse.setStatus(429);
            httpResponse.setHeader("X-Rate-Limit-Retry-After-Seconds", "" + TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            httpResponse.setContentType("text/plain");
            httpResponse.getWriter().append("Too many requests");
        }
2.2.3. Specifying initial amount of tokens
By default, initial size of the bucket equals capacity. But sometimes, you may want to have a lesser initial size, for example for the case of cold start in order to prevent denial of service:

int initialTokens = 42;
Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(1000).refillGreedy(1000, ofHours(1)).initialTokens(initialTokens))
    .build();
2.2.4. Returning tokens back to bucket
The compensating transaction is one of the obvious use cases when you want to return tokens back to the bucket:

Bucket wallet;
...
if (wallet.tryConsume(50)) { // get 50 cents from wallet
    try {
        buyCocaCola();
    } catch(NoCocaColaException e) {
        // return money to wallet
        wallet.addTokens(50);
    }
}
2.2.5. Customizing time measurement - choosing nanotime time resolution
By default, Bucket4j uses millisecond time resolution, it is the preferred time measurement strategy. But rarely(for example benchmarking) do you wish the nanosecond precision:

Bucket.builder().withNanosecondPrecision()
Be very careful to choose this time measurement strategy, because System.nanoTime() produces inaccurate results, use this strategy only if the period of bandwidth is too small that millisecond resolution will be undesired.

2.2.6. Customizing time measurement - Specify custom time measurement strategy
You can specify your custom time meter if existing milliseconds or nanotime time meters are not enough for your purposes. Imagine that you have a clock, which synchronizes its time with other machines in the current cluster, if you want to use the time provided by this clock instead of time provided by JVM then you can write something like this:

public class ClusteredTimeMeter implements TimeMeter {

    @Override
    public long currentTimeNanos() {
        return ClusteredClock.currentTimeMillis() * 1_000_000;
    }

}

Bucket bucket = Bucket.builder()
    .withCustomTimePrecision(new ClusteredTimeMeter())
    .addLimit(limit -> limit.capacity(100).refillGreedy(100, ofMinutes(1)))
    .build();
2.2.7. Blocking API example
Suppose that you implement consumer of messages from a messaging system and want to process message no fastly then desired rate

// define the bucket with capacity 100  and refill 100 tokens per 1 minute
Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(100).refillGreedy(100, ofMinutes(1)))
    .build();

// do polling in infinite loop
while (true) {
    List<Message> messages = consumer.poll();
    for (Message message : messages) {
        // Consume a token from the token bucket. If a token is not available this method will block until the refill adds one to the bucket.
        bucket.asBlocking().consume(1);
        process(message);
    }
}
2.3. Listening for bucket events
2.3.1. What can be listened
You can attach a listener to bucket by to track following events:
When tokens are consumed from a bucket.

When consumption requests were rejected by the bucket.

When the thread was parked to wait for tokens refill as a result of interaction with BlockingBucket.

When the thread was interrupted during the wait for tokens to be refilled as a result of interaction with BlockingBucket.

When a delayed task was submitted to ScheduledExecutorService as a result of interaction with AsyncScheduledBucket.

2.3.2. Listener API - corner cases
Question: How many listeners are needed to create an application that uses many buckets?

Answer: it depends on:

If you want to have aggregated statistics for all buckets then create a single listener per application and reuse this listener for all buckets.

If you want to measure statistics independently per bucket then use a listener per bucket model.

Question: where are methods the listener is invoking in case of distributed usage?

Answer: listener always invoked on the client-side, which means that each client JVM will have its independent stat for the same bucket.

Question: Why does bucket invoke the listener on the client-side instead of the server-side in case of distributed scenario? What do I need to do if I need an aggregated stat across the whole cluster?

Answer: Because of a planned expansion to non-JVM back-ends such as Redis, MySQL, PostgreSQL. It is not possible to serialize and invoke listener on this non-java back-ends, so it was decided to invoke listener on the client-side, to avoid inconsistency between different back-ends in the future. You can do post-aggregation of monitoring statistics via features built into your monitoring database or via mediator(like StatsD) between your application and the monitoring database.

2.3.3. Specify listener to local bucket at build time
BucketListener listener = new MyListener();

Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit,capacity(100).refillGreedy(100, ofMinutes(1)))
    .withListener(listener)
    .build()
2.3.4. Specify listener to distributed bucket at build time
BucketListener listener = new MyListener();

Bucket bucket = proxyManager.builder()
     .withListener(listener)
     .build(key, configSupplier);
2.3.5. Specify listener to async distributed bucket at build time
BucketListener listener = new MyListener();

AsyncBucketProxy bucket = proxyManager.asAsync().builder()
     .withListener(listener)
     .build(key, configSupplier);
2.3.6. Specify listener to distributed bucket at proxy-manager build time
You can configure default listener at proxy-manager build time. And this listener will be used for all bucket that belong to this proxy-manager. Bellow example for Hazelcast, the way to configure listener for other backends is the same.

BucketListener listener = new MyListener();

// listener will be attached to all buckets that belong to this proxy manager
HazelcastLockBasedProxyManager proxyManager = Bucket4jHazelcast.entryProcessorBasedBuilder(map)
    .defaultListener(listener)
    .build();
2.3.7. Specify listener to bucket at use time.
Sometimes listener is not known at bucket build time, and you want to clarify listener later. For example, it can happen when you want to share same bucket per multiple users, but in same time it needs to have dedicated listener per each user.

In such case you can build bucket without listener and attach it later via the toListenable method, this way will create a decorator to original bucket

public void doSomethingProtected(User user, Bucket bucket) {
    bucket = decorate(user, bucket).tryConsume(1)
    if (bucket.tryConsume(1)) {
        doSomething(user);
    } else {
        handleRateLimitError(user);
    }
}

...
private Bucket decorate(User user, Bucket originalbucket) {
    BucketListener listener = new BucketListener() {
        @Override
        public void onConsumed(long tokens) {
            // log something related for user or increase user related metrics
        }
        @Override
        public void onRejected(long tokens) {
            // log something related for user or increase user related metrics
        }
        ...
    }
    return originalbucket.toListenable(listener);
}
2.3.8. Example of integration with Dropwizard metrics-core
io.github.bucket4j.SimpleBucketListener is a simple implementation of io.github.bucket4j.BucketListener interface that is available out of the box. Below is the example of exposing statistics via Dropwizard Metrics(for Micrometer it should be quite similar):

public static Bucket decorateBucketByStatListener(Bucket originalBucket, String bucketName, MetricRegistry registry) {
  SimpleBucketListener stat = new SimpleBucketListener();
  registry.register(name + ".consumed", (Gauge<Long>) stat::getConsumed);
  registry.register(name + ".rejected", (Gauge<Long>) stat::getRejected);
  registry.register(name + ".parkedNanos", (Gauge<Long>) stat::getParkedNanos);
  registry.register(name + ".interrupted", (Gauge<Long>) stat::getInterrupted);
  registry.register(name + ".delayedNanos", (Gauge<Long>) stat::getDelayedNanos);

  return originalBucket.toListenable(stat);
}
2.4. Verbose/Debug API
Verbose API
is the API whose intent is in injecting low-level diagnostic information into the results of any interaction with a bucket. Verbose API provides the same functionality as Regular API, with one exception - a result of any method always decorated by VerboseResult wrapper.

VerboseResult
is the wrapper for interaction result that provides the snapshot of a bucket and its configuration that was actual at the moment of interaction with a bucket.

2.4.1. Verbose API entry-points
The way to get access for Verbose API is the same for all types of buckets, just call asVerbose() method:

[source, java]
Bucket bucket = …​; VerboseBucket verboseBucket = bucket.asVerbose(); VerboseSchedulingBucket verboseSchedulingBucket = bucket.asScheduler().asVerbose(); VerboseBlockingBucket VerboseBlockingBucket = bucket.asBlocking().asVerbose();

// for io.github.bucket4j.distributed.AsyncBucketProxy
AsyncBucketProxy bucket = ...;
AsyncVerboseBucket verboseBucket = bucket.asVerbose();
VerboseSchedulingBucket verboseSchedulingBucket = bucket.asScheduler().asVerbose();
2.4.2. Principles of result decoration
void return type always decorated by VerboseResult<Void>

A primitive result type like long, boolean always decorated by correspondent boxed type for example VerboseResult<Boolean>

Non-primitive result type always decorated as is, for example, VerboseResult<EstimationProbe>

2.4.3. Example of Verbose API usage
VerboseResult<ConsumptionProbe> verboseResult = bucket.asVerbose().tryConsumeAndReturnRemaining(numberOfTokens);

BucketConfiguration bucketConfiguration = verboseResult.getConfiguration();
long capacity = Arrays.stream(bucketConfiguration.getBandwidths())
                .mapToLong(Bandwidth::getCapacity)
                .max().getAsLong();
response.addHeader("RateLimit-Limit", "" + capacity));

VerboseResult.Diagnostics diagnostics = verboseResult.getDiagnostics()
response.addHeader("RateLimit-Remaining", "" + diagnostics.getAvailableTokens());
response.addHeader("RateLimit-Reset", "" + TimeUnit.NANOSECONDS.toSeconds(diagnostics.calculateFullRefillingTime()));

ConsumptionProbe probe = verboseResult.getValue();
if (probe.isConsumed()) {
    // the limit is not exceeded
    filterChain.doFilter(servletRequest, servletResponse);
} else {
    // limit is exceeded
    HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
    httpResponse.setStatus(429);
    httpResponse.setContentType("text/plain");
    httpResponse.getWriter().append("Too many requests");
}
2.5. On-the-fly configuration replacement
As previously mentioned in the definition for BucketConfiguration it is an immutable object. It is not possible to add, remove or change the limits for already created configuration, however, you can replace the configuration of the bucket via creating a new configuration instance and calling bucket.replaceConfiguration(newConfiguration, tokensInheritanceStrategy).

2.5.1. Why configuration replacement is not trivial?
The first problem of configuration replacement is deciding on how to propagate available tokens from a bucket with a previous configuration to the bucket with a new configuration. If you don’t care about previous the bucket state then use TokensInheritanceStrategy.RESET. But it becomes a tricky problem when we expect that previous consumption (that has not been compensated by refill yet) should take effect on the bucket with a new configuration. In this case, you need to choose between:

TokensInheritanceStrategy.PROPORTIONALLY

TokensInheritanceStrategy.AS_IS

TokensInheritanceStrategy.ADDITIVE

There is another problem when you are choosing PROPORTIONALLY, AS_IS or ADDITIVE and a bucket has more than one bandwidth. For example, how does replaceConfiguration implementation bind bandwidths to each other in the following example?

Bucket bucket = Bucket.builder()
    .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
    .addLimit(limit -> limit.capacity(10000).refillGreedy(10000, ofHours(1)))
    .build();
    ...
BucketConfiguration newConfiguration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(5000).refillGreedy(5000, ofHours(1)))
    .addLimit(limit -> limit.capacity(100).refillGreedy(100, ofSeconds(10)))
    .build();
bucket.replaceConfiguration(newConfiguration, TokensInheritanceStrategy.AS_IS);
It is obvious that a simple strategy - copying tokens by bandwidth index will not work well in this case, because it highly depends on the order in which bandwidths were mentioned in the new and previous configuration.

2.5.2. Taking control over replacement process via bandwidth identifiers
Instead of inventing the backward magic Bucket4j provides you the ability to keep control this process by specifying identifiers for bandwidth, so in case of multiple bandwidth configuration replacement codes can copy available tokens by bandwidth ID. So it is better to rewrite the code above as follows:

    Bucket bucket = Bucket.builder()
         .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)).id("technical-limit"))
         .addLimit(limit -> limit.capacity(10000).refillGreedy(10000, ofHours(1)).id("business-limit"))
         .build();
     ...
     BucketConfiguration newConfiguration = BucketConfiguration.builder()
         .addLimit(limit -> limit.capacity(100).refillGreedy(100, ofSeconds(10)).id("technical-limit"))
         .addLimit(limit -> limit.capacity(5000).refillGreedy(5000, ofHours(1)).id("business-limit"))
         .build();
     bucket.replaceConfiguration(newConfiguration, TokensInheritanceStrategy.PROPORTIONALLY);
There are the following rules for bandwidth identifiers:
By default bandwidth has <b>null</b> identifier.

null value of identifier equals to another null value if and only if there is only one bandwidth with a null identifier.

If an identifier for bandwidth is specified then it must be unique in the bucket. Bucket does not allow to create of several bandwidths with the same ID.

2.5.3. TokensInheritanceStrategy explanation
TokensInheritanceStrategy specifies the rules for inheritance of available tokens during configuration replacement process.

There are four strategies:
RESET
Use this mode when you want just to forget about the previous bucket state. RESET just instructs to erase all previous states. Using this strategy equals removing a bucket and creating again with a new configuration.

PROPORTIONALLY
Makes to copy available tokens proportional to bandwidth capacity by following formula: newAvailableTokens = availableTokensBeforeReplacement * (newBandwidthCapacity / capacityBeforeReplacement)

PROPORTIONALLY strategy examples:
Example 1: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of config replacement, there were 40 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(200).refillGreedy(10, ofMinutes(1)).build() 40 available tokens will be multiplied by 2(200/100), and after replacement, we will have 80 available tokens.

Example 2: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build(). At the moment of config replacement, there were 40 available tokens. After replacing this bandwidth by following Bandwidth.builder().capacity(20).refillGreedy(10, ofMinutes(1)).build() 40 available tokens will be multiplied by 0.2(20/100), and after replacement, we will have 8 available tokens.

AS_IS
Instructs to copy available tokens as is, but with one exclusion: if available tokens are greater than new capacity, available tokens will be decreased to new capacity.

AS_IS strategy examples:
Example 1: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of config replacement, it was 40 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(200).refillGreedy(10, ofMinutes(1)).build() 40 available tokens will be just copied, and after replacement, we will have 40 available tokens.

Example 2: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of config replacement, it was 40 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(20).refillGreedy(10, ofMinutes(1)).build() 40 available tokens can not be copied as is because it is greater than new capacity, so available tokens will be reduced to 20.

ADDITIVE
Instructs to copy available tokens as is, but with one exclusion: if new bandwidth capacity is greater than old capacity, available tokens will be increased by the difference between the old and the new configuration.

The formula is following:
newAvailableTokens = Math.min(availableTokensBeforeReplacement, newBandwidthCapacity) + Math.max(0, newBandwidthCapacity - capacityBeforeReplacement)

ADDITIVE strategy examples:
Example 1: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of configuration replacement, it was 40 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(200).refillGreedy(200, ofMinutes(1)).build() 40 available tokens will be copied and added to the difference between old and new configurations, and after replacement, we will have 140 available tokens.

Example 2: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of config replacement, it was 40 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(20).refillGreedy(10, ofMinutes(1)).build(), and after replacement we will have 20 available tokens.

Example 3: imagine bandwidth that was created by Bandwidth.builder().capacity(100).refillGreedy(10, ofMinutes(1)).build().

At the moment of config replacement, it was 10 available tokens.

After replacing this bandwidth by following Bandwidth.builder().capacity(100).refillGreedy(20, ofMinutes(1)).build(), and after replacement, we will have 10 available tokens.

2.6. Generic production checklist
The considerations described below apply to each solution based on the token-bucket or leaky-bucket algorithm. You need to understand, agree, and configure the following points:

2.6.1. Be wary of long periods
When you are planning to use any solution based on token-bucket for throttling incoming requests, you need to pay close attention to the throttling time window.

Example of a dangerous configuration:
Given a bucket with a limit of 10000 tokens/ per 1 hour per user.

A malicious attacker may send 9999 requests in a very short period, for example within 10 seconds. This would correspond to 100 requests per second which could seriously impact your system.

A skilled attacker could stop at 9999 requests per hour, and repeat every hour, which would make this attack impossible to detect (because the limit would not be reached).

To protect from this kind of attack, you should specify multiple limits like bellow

Bucket bucket = Bucket.builder()
    .addLimit(limit -> capacity(10_000).refillGreedy(10_000, ofHours(1)))
    .addLimit(limit -> capacity(20).refillGreedy(20, ofSeconds(1))) // attacker is unable to achieve 1000RPS and crash service in short time
The number of limits specified per bucket does not impact the performance.

2.6.2. Be wary of short-timed bursts
The token bucket is an efficient algorithm with a low and fixed memory footprint, independently of the incoming request rate (it can be millions per second) the bucket consumes no more than 40 bytes(five longs). But an efficient memory footprint has its own cost - bandwidth limitation is only satisfied over a long period. In other words, you cannot avoid short-timed bursts.

Let us describe an example of a local burst:
Given a bucket with a limit of 100 tokens/min. We start with a full bucket, i.e. with 100 tokens.

At T1 100 requests are made and thus the bucket becomes empty.

At T1+1min the bucket is full again because tokens are fully regenerated, and we can immediately consume 100 tokens.

This means that between T1 and T1+1min we have consumed 200 tokens. Over a long time, there will be no more than 100 requests per min, but as shown above, it is possible to burst at twice the limit here at 100 tokens per min.

These bursts are inherent to token bucket algorithms and cannot be avoided. If short-timed bursts are unacceptable you then have three options:
Do not use Bucket4j or any other solution implemented on top of token-bucket algorithms, because token-bucket is specially designed for network traffic management devices for which short-living traffic spike is a regular case, trying to avoid spike at all contradicts with the nature of token-bucket.

Since the value of burst always equals capacity, try to reduce the capacity and speed of refill. For example, if you have strong requirements 100tokens/60seconds then configure bucket as capacity=50tokens refill=50tokens/60seconds. It is worth mentioning that this way leads to the following drawbacks: — In one time you are not allowed to consume several tokens greater than capacity, according to the example above - before capacity reducing you were able to consume 100 tokens in a single request, after reducing you can consume 50 tokens in one request at max. — Reducing the speed of refill leads to under-consumption on long term periods, it is obvious that with refill 50tokens/60seconds you will be able to consume 3050 tokens for 1 hour, instead of 6100(as was prior refill reducing). — As a summary of the two drawbacks above, we can say that you will pay via under-consumption for eliminating the risk of overconsumption.

2.7. Technical limitations
To provide the best precision, Bucket4j uses integer arithmetic as much as possible, so any internal calculation is limited by bound Long.MAX_VALUE. The library introduces several limits that are described further, to be sure that calculations will never exceed the bound.

2.7.1. Maximum refill rate
The maximum refill rate is limited by 1 token/ 1 nanosecond. Following examples of API usage will raise exceptions

Bandwidth.builder().capacity(100).refillGreedy(2, ofNanos(1));
Bandwidth.builder().capacity(10_000).refillGreedy(1_001, ofNanos(1_000));
Bandwidth.builder().capacity(1_000_000).refillGreedy(1_000_001, ofMillis(1));
2.7.2. Limitation for refill period
Bucket4j works with time intervals as the 64-bit number of nanoseconds. So maximum refill period that is possible will be:

Duration.ofNanos(Long.MAX_VALUE);
Any attempt to specify a period longer than the limit above will fail with an exception. For example, the code below will fail

Bandwidth.builder(limit -> limit.capacity(...).refillGreedy(42, Duration.ofMinutes(153722867280912930));

Exception in thread "main" java.lang.ArithmeticException: long overflow
   at java.lang.Math.multiplyExact(Math.java:892)
   at java.time.Duration.toNanos(Duration.java:1186)
   ...
3. Distributed facilities
3.1. Production checklist especially in the context of distributed systems
Before using Bucket4j in clustered scenario you need to understand, agree, and configure the following points:

Do not forget about exception handling
When working within a distributed system, it is inevitable that requests may cross the border of the current JVM, leading to communication on the network. The network being unreliable, it is impossible to avoid failures. Thus, you should embrace this reality and be ready to get unchecked exceptions when interacting with a distributed bucket. It is your responsibility to handle(or ignore) such exceptions:

You probably do not want to fail business transactions if the grid responsible for throttling goes down. If this is the case you can simply log the exception and continue your business transaction without throttling

If you wish to fail your business transaction when the grid responsible for throttling goes down, simply rethrow or don’t catch the exception

Do not forget to configure backups
If the state of any bucket should survive the restart/crash of the grid node that holds its state, you need to configure backups yourself, in a way specific to the particular grid vendor. For example, see how to configure backups for Apache Ignite.

Retention tuning is your responsibility
When dealing with multi-tenant scenarios like a bucket per user or a bucket per IP address, the number of buckets in the cache will continuously increase. This is because a new bucket will be created each time a new key is detected.

To prevent exhausting the available memory of your cluster you need to configure the following aspects: * Maximum cache size(in units of bytes) - Obviously it is preferable to lose bucket data than lose the whole cluster due to memory exception. * Expiration policy Bucket4j provides way to configure flexible per-entry expiration for mostly integrations(excepting Apache Ignite). You need to read Bucket4j documentation for your particular backend in order tp find-out the way to configure expire policy.

High availability(HA) tuning and testing is your responsibility
There are no special settings for HA supported by Bucket4j because Bucket4j does nothing more than just invoking EntryProcessors on the cache. Instead, Bucket4j relies on you to configure the cache with proper parameters that control redundancy and high availability.

Years of experience working with the distributed system has taught the author that High Availability does not come for free. You need to test and verify that your system remains available. This cannot be provided by this or any other library. Your system will most certainly go down if you do not plan for that.

3.2. Integrations with in-memory grids
3.2.1. JCache integration
Bucket4j supports any GRID solution which compatible with JCache API (JSR 107) specification.

Note
Do not forget to read Distributed usage checklist before using the Bucket4j over the JCache cluster.
To use the JCache extension you also need to add the following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-jcache</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-jcache</artifactId>
    <version>8.14.0</version>
</dependency>
JCache expects javax.cache.cache-api to be a provided dependency. Do not forget to add the following dependency:

<dependency>
    <groupId>javax.cache</groupId>
    <artifactId>cache-api</artifactId>
    <version>${jcache.version}</version>
</dependency>
Example 1 - limiting access to HTTP server by IP address
Imagine that you develop any Servlet-based WEB application and want to limit access per IP basis. You want to use the same limits for each IP - 30 requests per minute.

ServletFilter would be the obvious place to check limits:

public class IpThrottlingFilter implements javax.servlet.Filter {

    private static final BucketConfiguration configuration = BucketConfiguration.builder()
          .addLimit(limit -> limit.capacity(30).refillGreedy(30, ofMinutes(1)))
          .build();

    // cache for storing token buckets, where IP is key.
    @Inject
    private javax.cache.Cache<String, byte[]> cache;

    private ProxyManager<String> buckets;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
         // init bucket registry
         buckets = Bucket4jJCache
            .entryProcessorBasedBuilder(cache)
             // setup optional parameters if necessary
            .build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        String ip = IpHelper.getIpFromRequest(httpRequest);

        // acquire cheap proxy to the bucket
        Bucket bucket = proxyManager.getProxy(key, () -> configuration);

        // tryConsume returns false immediately if no tokens available with the bucket
        if (bucket.tryConsume(1)) {
            // the limit is not exceeded
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            // limit is exceeded
            HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
            httpResponse.setContentType("text/plain");
            httpResponse.setStatus(429);
            httpResponse.getWriter().append("Too many requests");
        }
    }

}
Example 2 - limiting access to service by contract agreements
Imagine that you provide paid language translation service via HTTP. Each user has a unique agreement that differs from the other. Details of each agreement are stored in a relational database and take significant time to fetch(for example 100ms). The example above will not work fine in this case, because time to create/fetch the configuration of the bucket from the database will be 100 times slower than limit-checking itself. Bucket4j solves this problem via lazy configuration suppliers which are called if and only if the bucket was not yet stored in the grid, thus it is possible to implement a solution that will read the agreement from the database once per user.

public class IpThrottlingFilter implements javax.servlet.Filter {

    // service to provide per user limits
    @Inject
    private LimitProvider limitProvider;

    // cache for storing token buckets, where IP is key.
    @Inject
    private javax.cache.Cache<String, byte[]> cache;

    private ProxyManager<String> buckets;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
         // init bucket registry
         buckets = Bucket4jJCache
            .entryProcessorBasedBuilder(cache)
             // setup optional parameters if necessary
            .build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        String userId = AutentificationHelper.getUserIdFromRequest(httpRequest);

        // prepare configuration supplier which will be called(on the first interaction with proxy) if the bucket was not saved yet previously.
        Supplier<BucketConfiguration> configurationLazySupplier = getConfigSupplierForUser(userId);

        // acquire cheap proxy to the bucket
        Bucket bucket = proxyManager.getProxy(key, configurationLazySupplier);

        // tryConsume returns false immediately if no tokens available with the bucket
        if (bucket.tryConsume(1)) {
            // the limit is not exceeded
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            // limit is exceeded
            HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
            httpResponse.setContentType("text/plain");
            httpResponse.setStatus(429);
            httpResponse.getWriter().append("Too many requests");
        }
    }

    private Supplier<BucketConfiguration> getConfigSupplierForUser(String userId) {
         return () -> {
             long translationsPerDay = limitProvider.readPerDayLimitFromAgreementsDatabase(userId);
             return BucketConfiguratiion.builder()
                    .addLimit(limit -> limit.capacity(translationsPerDay).refillGreedy(1_000, ofDays(1)))
                     .build();
         };
    }

}
Why JCache specification is not enough in modern stacks and since 3.0 were introduced the dedicated modules for Infinispan, Hazelcast, Coherence and Ignite?
Asynchronous processing is very important for high-throughput applications, but JCache specification does not specify asynchronous API, because two early attempts to bring this kind of functionality at spec level 307, 312 were failed in absence of consensus.

Sad, but true, if you need for asynchronous API, then JCache extension is useless, and you need to choose from following extensions:
bucket4j-ignite

bucket4j-hazelcast

bucket4j-infinispan

bucket4j-coherence

Also, implementing the asynchronous support for any other JCache provider outside the list above should be an easy exercise, so feel free to return back the pull request addressed to cover your favorite JCache provider.

Verification of compatibility with a particular JCache provider is your responsibility
Important
Keep in mind that there are many non-certified implementations of JCache specifications on the market. Many of them want to increase their popularity by declaring support for the JCache API, but often only the API is supported and the semantic of JCache is totally ignored. Usage Bucket4j with this kind of library should be completely avoided.
Bucket4j is only compatible with implementations that obey the JCache specification rules(especially related to EntryProcessor execution). Oracle Coherence, Apache Ignite, Hazelcast are good examples of safe implementations of JCache.

Important
Because it is impossible to test all possible JCache providers, you need to test your provider by yourself.
Just run this code in order to be sure that your implementation of JCache provides good isolation for EntryProcessors

import javax.cache.Cache;
import javax.cache.processor.EntryProcessor;
import java.util.concurrent.CountDownLatch;
import java.io.Serializable;

public class CompatibilityTest {

    final Cache<String, Integer> cache;


    public CompatibilityTest(Cache<String, Integer> cache) {
        this.cache = cache;
    }

    public void test() throws InterruptedException {
        String key = "42";
        int threads = 4;
        int iterations = 1000;
        cache.put(key, 0);
        CountDownLatch latch = new CountDownLatch(threads);
        for (int i = 0; i < threads; i++) {
            new Thread(() -> {
                try {
                    for (int j = 0; j < iterations; j++) {
                        EntryProcessor<String, Integer, Void> processor = (EntryProcessor<String, Integer, Void> & Serializable) (mutableEntry, objects) -> {
                            int value = mutableEntry.getValue();
                            mutableEntry.setValue(value + 1);
                            return null;
                        };
                        cache.invoke(key, processor);
                    }
                } finally {
                    latch.countDown();
                }
            }).start();
        }
        latch.await();
        int value = cache.get(key);
        if (value == threads * iterations) {
            System.out.println("Implementation which you use is compatible with Bucket4j");
        } else {
            String msg = "Implementation which you use is not compatible with Bucket4j";
            msg += ", " + (threads * iterations - value) + " writes are missed";
            throw new IllegalStateException(msg);
        }
    }

}
The check does 4000 increments of integer in parallel and verifies that no one update has been missed. If the check passed then your JCache provider is compatible with Bucket4j, the throttling will work fine in a distributed and concurrent environment. If the check is not passed, then reach out to the particular JCache provider team and consult why its implementation misses the writes.

3.2.2. Hazelcast integration
Dependencies
To use Bucket4j extension for Hazelcast with Hazelcast 4.x you need to add the following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-hazelcast</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-hazelcast</artifactId>
    <version>8.14.0</version>
</dependency>
If you are using a legacy version of Hazelcast 4.x then you need to add the following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-hazelcast-4</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-hazelcast-4</artifactId>
    <version>8.14.0</version>
</dependency>
General compatibility matrix principles:
Bucket4j authors do not perform continuous monitoring of new Hazelcast releases. So, there is can be a case when there is no one version of Bucket4j which is compatible with the newly released Hazelcast, just log an issue to bug tracker in this case, adding support to new version of Hazelcast is usually an easy exercise.

Integrations with legacy versions of Hazelcast are not removed without a clear reason. Hence, You are in safety, even you are working in a big enterprise company that does not update its infrastructure frequently because You still get new Bucket4j’s features even for legacy Hazelcast releases.

Example of Bucket instantiation
IMap<K, byte[]> map = ...;
private static final HazelcastProxyManager<K> proxyManager = Bucket4jHazelcast
    .entryProcessorBasedBuilder(map)
     // setup optional parameters if necessary
    .build();

...
BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();

Bucket bucket = proxyManager.getProxy(key, () -> configuration);
Configuring flexible per entry expiration
It is possible configure precise expiration for bucket entries inside cache, in order to avoid storing data related to buckets more than it needs to refill for consumed tokens.

IMap<K, byte[]> map = ...;
Duration evictionJitter = Duration.ofSeconds(15);
ExpirationAfterWriteStrategy expiration = ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(evictionJitter)

private static final HazelcastProxyManager<K> proxyManager = Bucket4jHazelcast
    .entryProcessorBasedBuilder(map)
    .expirationAfterWrite(expiration)
     // setup optional parameters if necessary
    .build();
How to choose eviction jitter properly? Zero means immediate eviction after refill, however it is better to avoid too small jitter, because recreation of bucket after expiration will require one network hope, so it is better to configure at least of few seconds for jitter in order to avoid to frequent buckets recreation.

Configuring Custom Serialization for Bucket4j library classes
If you configure nothing, then by default Java serialization will be used for serialization Bucket4j library classes. Java serialization can be rather slow and should be avoided in general. Bucket4j provides custom serializers for all library classes that could be transferred over the network.

To let Hazelcast know about fast serializers you should register them programmatically in the serialization config:

import com.hazelcast.config.Config;
import com.hazelcast.config.SerializationConfig;
import com.hazelcast.config.SerializerConfig;
import io.github.bucket4j.grid.hazelcast.serialization.HazelcastSerializer;
...
    Config config = ...
    SerializationConfig serializationConfig = config.getSerializationConfig();

    // the starting type ID number for Bucket4j classes.
    // you free to choose any unused ID, but be aware that Bucket4j uses 2 types currently,
    // and may use more types in the future, so leave enough empty space after baseTypeIdNumber
    int baseTypeIdNumber = 10000;

    HazelcastProxyManager.addCustomSerializers(serializationConfig, baseTypeIdNumber);
Configuring Custom Serialization using a Hazelcast standalone cluster
In case the Hazelcast Cluster is running as a standalone cluster outside your application, maybe started directly using its own jar or hosted by a third party software, you are not in position to register the custom serializers programmatically.

In order to let the hazelcast cluster be aware of the custom serialization the following 3 actions are required:

Add the Bucket4j jars (bucket4j-core and bucket4j-hazelcast) into the classpath of each node of the Hazelcast cluster

Declare the typeIdBase via OS Environment Variable or via Java System Property, in both case the name is: bucket4j.hazelcast.serializer.type_id_base. Of course the value provided here at the Hazelcast server side has to be the same used programmatically into your java code at hazelcast client side.

Configure the custom serializers into the Hazelcast server configuration file, see the following hazelcast config snippet as reference:

# ----- Hazelcast SERIALIZATIONs configuration -----
serialization:
  serializers:
    - type-class: io.github.bucket4j.grid.hazelcast.HazelcastEntryProcessor
      class-name: io.github.bucket4j.grid.hazelcast.serialization.HazelcastEntryProcessorSerializer
    - type-class: io.github.bucket4j.grid.hazelcast.SimpleBackupProcessor
      class-name: io.github.bucket4j.grid.hazelcast.serialization.SimpleBackupProcessorSerializer
    - type-class: io.github.bucket4j.grid.hazelcast.HazelcastOffloadableEntryProcessor
      class-name: io.github.bucket4j.grid.hazelcast.serialization.HazelcastOffloadableEntryProcessorSerializer
Support for externally managed Hazelcast without classpath access
bucket4j-hazelcast requires putting Bucket4j jars to classpath of each node of Hazelcast cluster. Sometimes you have no control over classpath because the Hazelcast cluster is externally managed(Paas scenario). In such cases HazelcastProxyManager can not be used because it is implemented on top of EntryProcessor functionality.

Bucket4j provides two alternatives for PaaS topology:
HazelcastLockBasedProxyManager
is implemented on top IMap methods lock, get, put, unlock. This implementation always requires 4 network hops for one rate-limit check.

HazelcastCompareAndSwapBasedProxyManager
is implemented on top IMap methods get, replace, putIfAbsent. This implementation requires 2 network hops if no contention happens, but in case of high contention on the key amount of hops is unpredictable.

Limitations of HazelcastLockBasedProxyManager and HazelcastCompareAndSwapBasedProxyManager
HazelcastLockBasedProxyManager does not provide async API because of lack of lockAsync and unlockAsync methods inside IMap API.

HazelcastCompareAndSwapBasedProxyManager does not provide async API because lack of replaceAsync and putIfAbsentAsync methods inside IMap API.

If you wish to async API be supported by HazelcastLockBasedProxyManager and HazelcastCompareAndSwapBasedProxyManager ask Hazelcast maintainers to support the missed APIs mentioned above.

Known issues related with Docker and(or) SpringBoot
#186 HazelcastEntryProcessor class not found - check file permissions inside your image.

#182 HazelcastSerializationException with Hazelcast 4.2 - properly setup classloader for Hazelcast client configuration.

3.2.3. Apache Ignite integration
Before use bucket4j-ignite module please read [bucket4j-jcache documentation](jcache-usage.md), because bucket4j-ignite is just a follow-up of bucket4j-jcache.

Bucket4j supports Ignite Thin-Client as well as regular deployment scenarios.

Question: Bucket4j already supports JCache since version 1.2. Why it was needed to introduce direct support for Apache Ignite? Answer: Because JCache API (JSR 107) does not specify asynchronous API, developing the dedicated module bucket4j-ignite was the only way to provide asynchrony for users who use Bucket4j and Apache Ignite together.

Question: Should I migrate from bucket4j-jcache to bucketj-ignite If I do not need an asynchronous API? Answer: No, you should not migrate to bucketj-ignite in this case.

Dependencies
To use bucket4j-ignite extension you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-ignite</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-ignite</artifactId>
    <version>8.14.0</version>
</dependency>
Example of Bucket instantiation via IgniteProxyManager
org.apache.ignite.IgniteCache<K, byte[]> cache = ...;
private static final IgniteProxyManager proxyManager = Bucket4jIgnite.thickClient()
    .entryProcessorBasedBuilder(cache)
    // setup optional parameters if necessary
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
Important
Pay attention that IgniteProxyManager requires all nodes in the cluster to contain Bucket4j Jars in classpath.
Example of Bucket instantiation via Thin Client
org.apache.ignite.client.ClientCache<K, byte[]> cache = ...;
org.apache.ignite.client.ClientCompute clientCompute = ...;
private static final IgniteThinClientProxyManager<K> proxyManager = Bucket4jIgnite.thinClient()
    .clientComputeBasedBuilder(cache, clientCompute)
    // setup optional parameters if necessary
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
Important
Pay attention that IgniteThinClientProxyManager requires all nodes in the cluster to contain Bucket4j Jars in classpath.
Example of Bucket instantiation of via Thin Client and IgniteThinClientCasBasedProxyManager
org.apache.ignite.client.ClientCache<K, byte[]> cache = ...;
private static final IgniteThinClientCasBasedProxyManager<K> proxyManager = Bucket4jIgnite.thinClient()
    .casBasedBuilder(cache)
    // setup optional parameters if necessary
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
Important
IgniteThinClientCasBasedProxyManager does not require all nodes in the cluster to contain Bucket4j Jars in classpath, but it operates with more latency, so choose it over IgniteThinClientProxyManager if and only if you have no control over cluster classpath.
Notes about expiration-policy
In opposite to Infinispan, Coherence and Hazelcast, Ignite does not provide API to configure per-entry expiration. So, there is only one way to do something according the issue - configure per cache expiration, for example like there. If this is not acceptable, then switch to another in-memory grid, like one of mentioned above.

3.2.4. Infinispan integration
Dependencies
To use bucket4j-infinispan with Infinispan 9.x, 10.x extension you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-infinispan</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-infinispan</artifactId>
    <version>8.14.0</version>
</dependency>
General compatibility matrix principles::
Bucket4j authors do not perform continuous monitoring of new Infinispan releases. So, there is can be a case when there is no one version of Bucket4j which is compatible with the newly released Infinispan, just log an issue to bug tracker in this case, adding support to new version of Infinispan is usually an easy exercise.

Integrations with legacy versions of Infinispan are not removed without a clear reason. Hence, you are in safety, even you are working in a big enterprise company that does not update its infrastructure frequently because You still get new Bucket4j’s features even for legacy Infinispan releases.

Special notes for Infinispan 10.0+
As mentioned in the Infinispan Marshalling documentation, since release 10.0.0 Infinispan does not allow deserialization of custom payloads into Java classes. If you do not configure serialization(as described below), you will get an error like this on any attempt to use Bucket4j with a brand new Infinispan release:

Jan 02, 2020 4:57:56 PM org.infinispan.marshall.persistence.impl.PersistenceMarshallerImpl objectToBuffer
WARN: ISPN000559: Cannot marshall 'class io.github.bucket4j.grid.infinispan.InfinispanProcessor'
java.lang.IllegalArgumentException: No marshaller registered for Java type io.github.bucket4j.grid.infinispan.SerializableFunctionAdapter
   at org.infinispan.protostream.impl.SerializationContextImpl.getMarshallerDelegate(SerializationContextImpl.java:279)
   at org.infinispan.protostream.WrappedMessage.writeMessage(WrappedMessage.java:240)
   at org.infinispan.protostream.ProtobufUtil.toWrappedStream(ProtobufUtil.java:196)
There are three options to solve this problem: * Configure Jboss marshaling instead of defaulting ProtoStream marshaller as described there. * Configure Java Serialization Marshaller instead of default ProtoStream marshaller, as described there. Do not forget to add io.github.bucket4j.* regexp to the whitelist if choosing this way. * And last way(recommended) just register Bucket4j serialization context initializer in the serialization configuration. You can do it in both programmatically and declarative ways:

Programmatic registration of Bucket4jProtobufContextInitializer
import io.github.bucket4j.grid.infinispan.serialization.Bucket4jProtobufContextInitializer;
import org.infinispan.configuration.global.GlobalConfigurationBuilder;
...
GlobalConfigurationBuilder builder = new GlobalConfigurationBuilder();
builder.serialization().addContextInitializer(new Bucket4jProtobufContextInitializer());
Declarative registration of Bucket4jProtobufContextInitializer
<serialization>
    <context-initializer class="io.github.bucket4j.grid.infinispan.serialization.Bucket4jProtobufContextInitializer"/>
</serialization>
And that is all. Just registering Bucket4jProtobufContextInitializer in any way is enough to make Bucket4j compatible with ProtoStream marshaller, you do not have to care about *.proto files, annotations, whitelist, etc., all necessary Protobuf configs generated by Bucket4jProtobufContextInitializer and register on the fly.

Example of Bucket instantiation for EmbeddedCacheManager
org.infinispan.functional.FunctionalMap.ReadWriteMap<K, byte[]> map = ...;
private static final InfinispanProxyManager<K> proxyManager = Bucket4jInfinispan
    .entryProcessorBasedBuilder(cache)
     // setup optional parameters if necessary
    .build();
...
BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();

Bucket bucket = proxyManager.getProxy(key, configuration);
Example of Bucket instantiation for RemoteCacheManager(Hot Rod client)
org.infinispan.functional.FunctionalMap.ReadWriteMap<K, byte[]> map = ...;
private static final InfinispanProxyManager<K> proxyManager = Bucket4jInfinispan
    .hotrodClientBasedBuilder(remoteCache)
     // setup optional parameters if necessary
    .build();
...
BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();

Bucket bucket = proxyManager.getProxy(key, configuration);
3.2.5. Oracle Coherence integration
Dependencies
To use bucket4j-coherence extension you need to add the following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-coherence</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-coherence</artifactId>
    <version>8.14.0</version>
</dependency>
Example of Bucket instantiation
com.tangosol.net.NamedCache<K, byte[]> cache = ...;
private static final CoherenceProxyManager<K> proxyManager = Bucket4jCoherence
    .entryProcessorBasedBuilder(cache)
     // setup optional parameters if necessary
    .build();

...
BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();

Bucket bucket = proxyManager.getProxy(key, () -> configuration);
Configuring POF serialization for Bucket4j library classes
If you configure nothing, then by default Java serialization will be used for serialization Bucket4j library classes. Java serialization can be rather slow and should be avoided in general. Bucket4j provides custom POF serializers for all library classes that could be transferred over the network. To let Coherence know about POF serializers you should register three serializers in the POF configuration config file:

io.github.bucket4j.grid.coherence.pof.CoherenceEntryProcessorPofSerializer for class io.github.bucket4j.grid.coherence.CoherenceProcessor

Example of POF serialization config:
<pof-config xmlns="http://xmlns.oracle.com/coherence/coherence-pof-config"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://xmlns.oracle.com/coherence/coherence-pof-config coherence-pof-config.xsd">

    <user-type-list>
        <!-- Include default Coherence types -->
        <include>coherence-pof-config.xml</include>

        <!-- Define serializers for Bucket4j classes -->
        <user-type>
            <type-id>1001</type-id>
            <class-name>io.github.bucket4j.grid.coherence.CoherenceProcessor</class-name>
            <serializer>
                <class-name>io.github.bucket4j.grid.coherence.pof.CoherenceEntryProcessorPofSerializer</class-name>
            </serializer>
        </user-type>
    </user-type-list>
</pof-config>
Double-check with official Oracle Coherence documentation in case of any questions related to Portable Object Format.

3.3. Bucket4j-Redis
Bucket4j provides integration with four Redis libraries:

Library	Async supported	Redis cluster supported
Redisson

Yes

Yes

Lettuce

Yes

Yes

Jedis

No

Yes

Important
For all libraries mentioned above concurrent access to Redis is solved by Compare&Swap pattern, this can be improved in the future via switching to Javascript stored procedures.
3.3.1. Lettuce integration
Dependencies
To use bucket4j-letucce extension you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-lettuce</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-lettuce</artifactId>
    <version>8.14.0</version>
</dependency>
Example of Bucket instantiation via LettuceBasedProxyManager
StatefulRedisConnection<K, byte[]> connection = ...;
LettuceBasedProxyManager<K> proxyManager = Bucket4jLettuce.casBasedBuilder(connection)
    .expirationAfterWrite(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(ofSeconds(10)))
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
3.3.2. Redisson integration
Dependencies
To use bucket4j-redisson extension you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-redisson</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-redisson</artifactId>
    <version>8.14.0</version>
</dependency>
Example of Bucket instantiation via RedissonBasedProxyManager
RedissonBasedProxyManager<String> proxyManager = Bucket4jRedisson.casBasedBuilder(jedisPool)
    .expirationAfterWrite(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(ofSeconds(10)))
    .keyMapper(Mapper.STRING)
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
3.3.3. Jedis integration
Dependencies
To use bucket4j-jedis extension you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-jedis</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-redis-common</artifactId>
    <version>8.14.0</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-jedis</artifactId>
    <version>8.14.0</version>
</dependency>
Example of Bucket instantiation via JedisBasedProxyManager
redis.clients.jedis.JedisPool jedisPool = ...;
JedisBasedProxyManager<String> proxyManager = Bucket4jJedis.casBasedBuilder(jedisPool)
    .expirationAfterWrite(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(ofSeconds(10)))
    .keyMapper(Mapper.STRING)
    .build();
...

BucketConfiguration configuration = BucketConfiguration.builder()
    .addLimit(limit -> capacity(1_000).refillGreedy(1_000, ofMinutes(1)))
    .build();
Bucket bucket = proxyManager.getProxy(key, () -> configuration);
3.4. JDBC integrations
General principles to use each JDBC integration:

Bucket4j authors do not provide create a table for store buckets, you must make the table personally. Examples of DDL provided for each integration.

You should create a trigger or a scheduler that will clear your bucket storage table since DBMS is not IMDB, and DBMS don’t give TTL the opportunity.

3.4.1. Overriding table and columns naming scheme
There is three naming parameters
tableName - name of table to use as a Buckets store. Default value is bucket

idName - name of primary key column. Default value is id

stateName - name of column to store state of bucket. Default value is state

You can change naming as you wish, at proxy-manager build time. Bellow is example for Mysql, the code for other integrations will be the same

MySQLSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jMySQL
    .selectForUpdateBasedBuilder(dataSource)
    .table("user_buckets")
    .idColumn("user_id")
    .stateColumn("state_bytes")
    .build()
3.4.2. Overriding type of primary key
By default java.lang.Long is used as Java representation of value for primary-key column, and it is expected that type of primary column must be assigned from Long during specifying parameters of PreparedStatement.

Sometimes you want to have to setting up something else for primary key column, for example java.lang.String and its correspondent type in database. You can configure custom primary-key type at proxy-manager build time. Bellow is example for PostgreSQL, the code for other integrations will be the same

CREATE TABLE IF NOT EXISTS bucket(id VARCHAR PRIMARY KEY, state BYTEA);
PostgreSQLSelectForUpdateBasedProxyManager<String> proxyManager = Bucket4jPostgreSQL
    .selectForUpdateBasedBuilder(dataSource)
    .primaryKeyMapper(PrimaryKeyMapper.STRING)
    .build();
There are several predefined mappers defined inside io.github.bucket4j.distributed.jdbc.PrimaryKeyMapper, if nothing suitable then you can define own by implementing this interface.

3.4.3. Expiration Policy
Relational databases have no built-in auto-expiration functionality like for example Redis has. For all Jdbc integrations Bucket4j just calculates expires_at column if expire-policy is configured. Then, you need to manually trigger the removing of expired bucket, like bellow

CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BYTEA, expires_at BIGINT);
PostgreSQLSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jPostgreSQL
    .selectForUpdateBasedBuilder(dataSource)
    .expirationAfterWrite(basedOnTimeForRefillingBucketUpToMax(Duration.ofSeconds(60)))
    .build();

private static final int MAX_TO_REMOVE_IN_ONE_TRANSACTION = 1_000;
private static final int THRESHOLD_TO_CONTINUE_REMOVING = 50;

// once per day at 4:30 morning
@Scheduled(cron = "0 30 4 * * *")
public void scheduleFixedDelayTask() {
    int removedKeysCount;
    do {
        removedCount = proxyManager.removeExpired(MAX_TO_REMOVE_IN_ONE_TRANSACTION);
        if (removedKeysCount > 0) {
            logger.info("Removed {} expired buckets", removedCount);
        } else {
            logger.info("There are no expired buckets to remove");
        }
   } while (removedCount > THRESHOLD_TO_CONTINUE_REMOVING)
}
3.4.4. PostgreSQL integration
Dependencies
To use Bucket4j extension for PostgreSQL you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-postgresql</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-postgresql</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BYTEA);
// in case of expiration feature is required for PostgreSQLSelectForUpdateBasedProxyManager
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BYTEA, expires_at BIGINT);
// in case of expiration feature is required for PostgreSQLAdvisoryLockBasedProxyManager
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BYTEA, expires_at BIGINT, explicit_lock BIGINT);
PostgreSQLSelectForUpdateBasedProxyManager
PostgreSQLSelectForUpdateBasedProxyManager - is based on Select For Update standard SQL Syntax. This prevents them from being modified or deleted by other transactions until the current transaction ends. That is, other transactions that attempt UPDATE, DELETE, or SELECT FOR UPDATE of these rows will be blocked until the current transaction ends. Also, if an UPDATE, DELETE, or SELECT FOR UPDATE from another transaction has already locked a selected row or rows, SELECT FOR UPDATE will wait for the other transaction to complete, and will then lock and return the updated row (or no row, if the row was deleted). Within a SERIALIZABLE transaction, however, an error will be thrown if a row to be locked has changed since the transaction started.

PostgreSQLadvisoryLockBasedProxyManager<Long> proxyManager = Bucket4jPostgreSQL
    .selectForUpdateBasedBuilder(dataSource)
    .build();
...
Long key = 1L;
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
    .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
PostgreSQLAdvisoryLockBasedProxyManager
PostgreSQLadvisoryLockBasedProxyManager - is based on pg_advisory_xact_lock locks an application-defined resource, which can be identified either by a single 64-bit key value or two 32-bit key values (note that these two key spaces do not overlap). If another session already holds a lock on the same resource identifier, this function will wait until the resource becomes available. The lock is exclusive. Multiple lock requests stack so that if the same resource is locked three times it must then be unlocked three times to be released for other sessions use. The lock is automatically released at the end of the current transaction and cannot be released explicitly.

PostgreSQLadvisoryLockBasedProxyManager<Long> proxyManager = Bucket4jPostgreSQL
    .advisoryLockBasedBuilder(dataSource)
    .build();
...
Long key = 1L;
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
    .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
3.4.5. MySQL integration
Dependencies
To use bucket4j-coherence extension you need to add the following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-coherence</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-coherence</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BLOB);
// in case of expiration feature is required
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BLOB, expires_at BIGINT);
Example of Bucket instantiation
MySQLSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jMySQL
    .selectForUpdateBasedBuilder(dataSource)
    .build();

...
Long key = 1L;
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
        .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
        .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
3.4.6. MariaDB integration
Dependencies
To use Bucket4j extension for MariaDB you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-mariadb</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-mariadb</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BLOB);
// in case of expiration feature is required
CREATE TABLE IF NOT EXISTS bucket(id BIGINT PRIMARY KEY, state BLOB, expires_at BIGINT);
Example of Bucket instantiation
MariaDBSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jMariaDB
    .selectForUpdateBasedBuilder(dataSource)
    .build();

...
Long key = 1L;
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
    .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
3.4.7. Oracle database integration
Dependencies
To use Bucket4j extension for Oracle you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-oracle</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-oracle</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE bucket(id NUMBER NOT NULL PRIMARY KEY, state RAW(255));
// in case of expiration feature is required
CREATE TABLE bucket(id NUMBER NOT NULL PRIMARY KEY, state RAW(255), expires_at NUMBER);
Example of Bucket instantiation
OracleSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jOracle
    .selectForUpdateBasedBuilder(dataSource)
    .build();
...
Long key = 1L;
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
    .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
    .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
3.4.8. MicrosoftSQLServer integration
Dependencies
To use Bucket4j extension for Microsoft SQL Server you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-mssql</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-mssql</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE bucket(id BIGINT NOT NULL PRIMARY KEY, state BINARY(256))
// in case of expiration feature is required
CREATE TABLE bucket(id BIGINT NOT NULL PRIMARY KEY, state BINARY(256), expires_at BIGINT)
Example of Bucket instantiation
MSSQLSelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jMSSQL
    .selectForUpdateBasedBuilder(dataSource)
    .build();
...
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
        .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
        .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
3.4.9. IBM Db2 integration
Dependencies
To use Bucket4j extension for IBM Db2 Server you need to add following dependency:

<!-- For java 17 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-db2</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- For java 11 -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk11-db2</artifactId>
    <version>8.14.0</version>
</dependency>
DDL example
// in case of expiration feature is not required
CREATE TABLE bucket(id BIGINT NOT NULL PRIMARY KEY, state VARCHAR(512))
// in case of expiration feature is required
CREATE TABLE bucket(id BIGINT NOT NULL PRIMARY KEY, state VARCHAR(512), expires_at BIGINT)
Example of Bucket instantiation
Db2SelectForUpdateBasedProxyManager<Long> proxyManager = Bucket4jDb2
    .selectForUpdateBasedBuilder(dataSource)
    .build();
...
BucketConfiguration bucketConfiguration = BucketConfiguration.builder()
        .addLimit(limit -> limit.capacity(10).refillGreedy(10, ofSeconds(1)))
        .build();
BucketProxy bucket = proxyManager.getProxy(key, () -> bucketConfiguration);
4. Distributed facilities advanced topics
4.1. Asynchronous API
Since version 3.0 Bucket4j provides asynchronous analogs for the majority of API methods. Async view of proxyManager is available through asAsync() method:

ProxyManager proxyManager = ...;
AsyncProxyManager asyncProxyManager = proxyManager.asAsync();

BucketConfiguration configuration = ...;
AsyncBucketProxy asyncBucket = asyncProxyManager.getProxy(key, () -> configuration);
Each method of class AsyncBucketProxy has full equivalence with the same semantic in asynchronous version in the Bucket class.

4.1.1. Example - limiting the rate of access to the asynchronous servlet
Imagine that you develop an SMS service, which allows sending SMS via an HTTP interface. You want your architecture to be protected from overloading, clustered, and fully asynchronous.

Overloading protection requirement:

To prevent fraud and service overloading you want to introduce the following limit for any outbound phone number: The bucket size is 20 SMS (which cannot be exceeded at any given time), with a "refill rate" of 10 SMS per minute that continually increases tokens in the bucket. In other words, if a client sends 10 SMS per minute, it will never be throttled, and moreover, the client has overdraft equals to 20 SMS which can be used if the average is a little bit higher than 10 SMS/minute on short time period. Solution: let’s use Bucket4j for this.

Clustering requirement:

You want to avoid the single point of failure, if one server crashed that information about consumed tokens should not be lost, thus it would be better to use any distributed computation platform for storing the buckets.

Solution: let’s use JBoss Infinispan for this and bucket4j-infinispan extension. Hazelcast and Apache Ignite will be also well-chosen, Infinispan just selected as an example.

Asynchronous processing requirement: Also for maximum scalability, you want from architecture to be fully non-blocking, non-blocking architecture means that both sms sending and limit checking should be asynchronous. Solution: let’s use asynchronous features provided by Bucket4j and Servlet-API.

Mockup of service based on top of Servlet API and bucket4j-infinispan:

public class SmsServlet extends javax.servlet.http.HttpServlet {

    private SmsSender smsSender;
    private AsyncProxyManager<String> buckets;
    private Supplier<BucketConfiguration> configurationSupplier;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        ServletContext ctx = config.getServletContext();

        smsSender = (SmsSender) ctx.getAttribute("sms-sender");

        FunctionalMapImpl<String, byte[]> bucketMap = (FunctionalMapImpl<String, byte[]>) ctx.getAttribute("bucket-map");
        this.buckets = new InfinispanProxyManager(bucketMap).asAsync();

        this.configurationSupplier = () -> {
            return BucketConfiguratiion.builder()
                .addLimit(limit -> limit.capacity(20).refillGreedy(10, Duration.ofMinutes(1)))
                .build();
        };
    }

    @Override
    protected void doPost(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;

        String fromNumber = req.getParameter("from");
        String toNumber = req.getParameter("to");
        String text = req.getParameter("text");

        AsyncBucketProxy bucket = buckets.getProxy(fromNumber, configurationSupplier);
        CompletableFuture<ConsumptionProbe> limitCheckingFuture = bucket.asAsync().tryConsumeAndReturnRemaining(1);
        final AsyncContext asyncContext = req.startAsync();
        limitCheckingFuture.thenCompose(probe -> {
            if (!probe.isConsumed()) {
                Result throttledResult = Result.throttled(probe);
                return CompletableFuture.completedFuture(throttledResult);
            } else {
                CompletableFuture<Result> sendingFuture = smsSender.sendAsync(fromNumber, toNumber, text);
                return sendingFuture;
            }
        }).whenComplete((result, exception) -> {
            HttpServletResponse asyncResponse = (HttpServletResponse) asyncContext.getResponse();
            try {
                asyncResponse.setContentType("text/plain");
                if (exception != null || result.isFailed()) {
                    asyncResponse.setStatus(500);
                    asyncResponse.getWriter().println("Internal Error");
                } else if (result.isThrottled()) {
                    asyncResponse.setStatus(429);
                    asyncResponse.setHeader("X-Rate-Limit-Retry-After-Seconds", "" + result.getRetryAfter());
                    asyncResponse.getWriter().append("Too many requests");
                } else {
                    asyncResponse.setStatus(200);
                    asyncResponse.getWriter().append("Success");
                }
            } finally{
                asyncContext.complete();
            }
        });
    }

}
4.2. Implicit configuration replacement
How does explicit configuration replacement work for case of distributed buckets:
distributed bucket operates with configuration that was provided at the time of its creation. Providing the new configuration via RemoteBucketBuilder takes no effect if bucket already exists in the persistent storage, because configuration is stored together with state of bucket. There is only one way to replace configuration of bucket - is explicit calling of replaceConfiguration(or its async analog).

Explicit config replacement can be awkward in the following cases:
It requires for library client to write the code for configuration replacement. It is unnecessary job, that is especially hard when Bucket4j is used behind of high-level frameworks like bucket4j-spring-boot-starter, when end-clients are not mentally prepared to work directly with low-level API of Bucket4j.

It can confuse the user in the following scenario: user stores limits in the configuration for example in properties or yaml file, user updates configuration files and restarts application, and he becomes surprised because new limits are not applied for buckets that survive application restart in the storage, because as was mentioned above only one way to change the config for already persisted bucket is explicitly calling of replaceConfiguration for each persisted bucket.

For some persistent technologies like Redis it is costly to identify all buckets that are persisted in the storage, because lack of mechanisms for grouping like tables or caches leads to scan all keys, even keys that points to data that not related to rate-limiting.

Implicit configuration replacement solution:
Implicit configuration replacement feature is addressed to solve the awkward described above. It works based on configuration version, when bucket detects that persisted configuration version is less that provided through builder API then persisted configuration is being replaced automatically without disturbing the client. Both RemoteBucketBuilder and RemoteAsyncBucketBuilder contains the API to configure desired configuration version.

Example of usage
BucketConfiguration config = ...;
BucketProxy bucket = proxyManager.builder()
    .withImplicitConfigurationReplacement(1, TokensInheritanceStrategy.PROPORTIONALLY)
    .build(666L, config);
4.3. Framework to implement custom work with your database
The Bucket4j library allows implementing work with any database. If you didn’t find in distributed realization your database (currently Bucket4j supports the next databases: Redis, Hazelcast, Apache Ignite, Infinispan, Oracle coherence, PostgreSQL, MySQL) you can implement your database as a distributed storage. All what you need to do, extends from io.github.bucket4j.distributed.proxy.generic.select_for_update.AbstractLockBasedProxyManager or AbstractSelectForUpdateBasedProxyManager<T> and override 3 methods and create your implementation which implements from io.github.bucket4j.distributed.proxy.generic.select_for_update.LockBasedTransaction.

Step by step to take that.

First of all we need to create our custom proxy manages which extends from AbstractLockBasedProxyManager<T> or AbstractSelectForUpdateBasedProxyManager<T> (as genetic classes takes a type of key table). To define in which class you should extend, need to understand the main idea of these classes:

AbstractLockBasedProxyManager<T> - Uses to realize based on exclusive locks

AbstractSelectForUpdateBasedProxyManager<T> - Uses to realize Select For Update concept

After need to override works of allocation transaction, to do that, we should override method allocateTransaction. The main idea of allocateTransaction to just return class which implements LockBasedTransaction (for AbstractLockBasedProxyManager<T>) or SelectForUpdateBasedTransaction (for AbstractSelectForUpdateBasedProxyManager<T>) - we will implement it later And override removeProxy() for remove bucket from the table which store buckets.

Second of all

Need to implement LockBasedTransaction or SelectForUpdateBasedTransaction to realize custom work of database for transaction.

To do that, we need to create a custom class to implement from one of these classes

LockBasedTransaction

    /**
     * Begins transaction if underlying storage requires transactions.
     * There is strong guarantee that {@link #commit()} or {@link #rollback()} will be called if {@link #begin()} returns successfully.
     */
    void begin();

    /**
     * Rollbacks transaction if underlying storage requires transactions
     */
    void rollback();

    /**
     * Commits transaction if underlying storage requires transactions
     */
    void commit();

    /**
     * Locks data by the key associated with this transaction and returns data that is associated with the key.
     * There is strong guarantee that {@link #unlock()} will be called if {@link #lockAndGet()} returns successfully.
     *
     * @return Returns the data by the key associated with this transaction, or null data associated with key does not exist
     */
    byte[] lockAndGet();

    /**
     * Unlocks data by the key associated with this transaction.
     */
    void unlock();

    /**
     * Creates the data by the key associated with this transaction.
     *
     * @param data bucket state to persists
     */
    void create(byte[] data);

    /**
     * Updates the data by the key associated with this transaction.
     *
     * @param data bucket state to persists
     */
    void update(byte[] data);

    /**
     * Frees resources associated with this transaction
     */
    void release();
As an example, you can see to the PostgreSQL or MySQL realization which based on select for update concept.

SelectForUpdateBasedTransaction

    /**
     * Begins transaction if underlying storage requires transactions.
     * There is strong guarantee that {@link #commit()} or {@link #rollback()} will be called if {@link #begin()} returns successfully.
     */
    void begin();

    /**
     * Rollbacks transaction if underlying storage requires transactions
     */
    void rollback();

    /**
     * Commits transaction if underlying storage requires transactions
     */
    void commit();

    /**
     * Locks data by the key associated with this transaction and returns data that is associated with the key.
     *
     * @return the data by the key associated with this transaction, or null data associated with key does not exist
     */
    LockAndGetResult tryLockAndGet();

    /**
     * Creates empty data by for the key associated with this transaction.
     * This operation is required to be able to lock data in the scope of next transaction.
     *
     * @return true if data has been inserted
     */
    boolean tryInsertEmptyData();

    /**
     * Updates the data by the key associated with this transaction.
     *
     * @param data bucket state to persists
     */
    void update(byte[] data);

    /**
     * Frees resources associated with this transaction
     */
    void release();
Version 8.14.0
Last updated 2024-07-30 15:16:39 +0300