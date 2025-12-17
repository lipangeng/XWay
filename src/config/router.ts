import { ServiceType } from '../constants';
import { RouteMap } from '../types/router';

export const defaultRoutes: RouteMap = {
	// Container Registries
	'docker': {
		upstream: 'https://registry-1.docker.io',
		type: ServiceType.CONTAINER
	},
	'quay': {
		upstream: 'https://quay.io',
		type: ServiceType.CONTAINER
	},
	'gcr': {
		upstream: 'https://gcr.io',
		type: ServiceType.CONTAINER
	},
	'ghcr': {
		upstream: 'https://ghcr.io',
		type: ServiceType.CONTAINER
	},
	'k8s': {
		upstream: 'https://registry.k8s.io',
		type: ServiceType.CONTAINER
	},
	'mcr': {
		upstream: 'https://mcr.microsoft.com',
		type: ServiceType.CONTAINER
	},
	'ecr': {
		upstream: 'https://public.ecr.aws',
		type: ServiceType.CONTAINER
	},
	'gitlab': {
		upstream: 'https://registry.gitlab.com',
		type: ServiceType.CONTAINER
	},
	'redhat': {
		upstream: 'https://registry.redhat.io',
		type: ServiceType.CONTAINER
	},
	'oracle': {
		upstream: 'https://container-registry.oracle.com',
		type: ServiceType.CONTAINER
	},
	'cloudsmith': {
		upstream: 'https://docker.cloudsmith.io',
		type: ServiceType.CONTAINER
	},
	'digitalocean': {
		upstream: 'https://registry.digitalocean.com',
		type: ServiceType.CONTAINER
	},
	'vmware': {
		upstream: 'https://projects.registry.vmware.com',
		type: ServiceType.CONTAINER
	},
	'heroku': {
		upstream: 'https://registry.heroku.com',
		type: ServiceType.CONTAINER
	},
	'suse': {
		upstream: 'https://registry.suse.com',
		type: ServiceType.CONTAINER
	},
	'opensuse': {
		upstream: 'https://registry.opensuse.org',
		type: ServiceType.CONTAINER
	},
	'gitpod': {
		upstream: 'https://registry.gitpod.io',
		type: ServiceType.CONTAINER
	}
};
